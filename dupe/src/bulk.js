'use strict';

const { Readable } = require('stream');
const multer = require('multer');
const csv = require('csv-parser');
const { Model, castModel, muri, objectIntoNamedFields, Cardinality } = require("perrydl");
const fetch = require('node-fetch');
const Ajv = require('ajv');
const {
    graphqlFormatTypeName,
} = require('perrydl');

const ajv = new Ajv({ coerceTypes: true });

const upload = multer();

const metadataValidator = ajv.compile({
    type: "object",
    properties: {
        entity_urn: { type: "string" },
        columns: { type: "array", items: { type: "string" } },
        skip_lines: { type: "integer" }
    },
    required: ["entity_urn", "columns"]
});

const preprocessForm = (req, res) => {
    if (!("csv" in req.files) || !req.files.csv.length) {
        res.status(400).send('csv file is missing');
        return null;
    }

    if (!("metadata" in req.files) || !req.files.metadata.length) {
        res.status(400).send('metadata is missing');
        return null;
    }

    let metadata = null;
    try {
        metadata = JSON.parse(req.files.metadata[0].buffer);
    } catch (err) {
        res.status(400).send(`invalid metadata: ${err}`);
        return null;
    }
    const valid = metadataValidator(metadata);
    if (!valid) {
        res.status(400).send(`invalid metadata: ${JSON.stringify(metadataValidator.errors)}`);
        return null;
    }

    // Validate columns
    const notAttribute = metadata.columns.find(column => !muri.isAttribute(column));
    if (notAttribute) {
        res.status(400).send(`invalid column '${notAttribute}', is not an attribute`);
        return null;
    }

    // Allow only one level nesting of Entities
    const tooDeep = metadata.columns.find(uri => muri.depth(uri) > 4);
    if (tooDeep) {
        res.status(400).send(`invalid column '${tooDeep}', nesting is too deep`);
        return null;
    }

    return metadata;
};

// Perform GraphQL mutation
const doMutation = async (endpoint, mutation, headers) => {
    const post = await fetch(endpoint, {
        method: "POST",
        cache: 'no-cache',
        headers,
        body: mutation
    });

    const status = post.status;
    const toSend = status < 300 ? await post.json() : await post.text();
    return [status, toSend];
};


const getFormFields = () => upload.fields([{ name: 'csv' }, { name: 'metadata' }]);

const handle = (req, res, { verb, endpoint, auth, model, validators }) => {
    const metadata = preprocessForm(req, res);
    if (!metadata)
        return;

    if (!(metadata.entity_urn in validators)) {
        res.status(400).send(`unknown entity ${metadata.entity_urn}`);
        return;
    }

    const isMainEntity = (uri) => muri.deepestUrn(uri) === metadata.entity_urn;

    // Object mapper with one function per column.
    // Translates column index to object shape.
    const columnMapper = {};

    // Columns of the entity being inserted.
    // const entityColumns = metadata.columns.filter(isMainEntity).map(muri.basename);
    metadata.columns.forEach((uri, index) => {
        if (isMainEntity(uri)) {
            const key = muri.basename(uri);
            columnMapper[index.toString()] = (obj, value) => {
                obj[key] = value;
            };
            return;
        }

        // For related entities, assume empty string as undefined
        const urn = muri.deepestUrn(uri);
        const relationUrn = model.getRelationsBetween(urn, metadata.entity_urn)[0];
        const cardinality = model.findRelationByUrn(relationUrn).getCardinality();
        const toMany = cardinality === Cardinality.ManyToMany;
        const key = toMany ? model.findEntityByUrn(urn).getPlural() : model.findEntityByUrn(urn).getSingular();
        const innerKey = muri.basename(uri);

        columnMapper[index.toString()] = (obj, value) => {
            if (!value || (typeof value === "string" && !value.length))
                return;
            const inner = { [innerKey]: value };
            if (toMany)
                obj[key] = obj[key] ? [{ ...obj[key][0], ...inner }] : [inner];
            else
                obj[key] = obj[key] ? { ...obj[key], ...inner } : inner;
        };
    });

    // Validate entity attributes.
    for (let uri of metadata.columns) {
        const urn = muri.deepestUrn(uri);
        const attributeId = muri.basename(uri);
        const entity = model.findEntityByUrn(urn);
        const attribute = entity.findAttributeById(attributeId);
        if (!attribute) {
            res.status(400).send(`attribute ${attributeId} not found for entity ${urn}`);
            return;
        }
        if (urn === metadata.entity_urn)
            continue;
    }

    const singular = model.findEntityByUrn(metadata.entity_urn).getSingular();
    let functionName = "";
    switch (verb) {
        case "create":
            functionName = `bulkCreate${graphqlFormatTypeName(singular)}`;
            break;
        case "update":
            functionName = `bulkUpdate${graphqlFormatTypeName(singular)}`;
            break;
        default:
            throw new Error(`verb ${verb} not supported`);
    };

    let mutation = `mutation { ${functionName}(input: [\n`;

    const validator = validators[metadata.entity_urn];
    let failed = false;
    let previous = {};
    let count = 0;

    const parseError = (current, prev, error, line) => {
        res
            .status(400)
            .send(`at line ${line}, invalid row: '${JSON.stringify(current)}':\n\t${JSON.stringify(error)}\nprevious line was: ${JSON.stringify(prev)}`);
    };

    const readable = new Readable();
    readable._read = () => { };
    readable.push(req.files.csv[0].buffer);
    readable.push(null);
    readable.pipe(csv({
        headers: metadata.columns.map((_, i) => i.toString()),
        separator: metadata.separator || ",",
        strict: true,
        skipLines: metadata.skip_lines || 0
    }))
        .on('data', (data) => {
            if (failed)
                return;

            const preConv = Object.keys(data).reduce((obj, key) => {
                columnMapper[key](obj, data[key]);
                return obj;
            }, {});

            // data type is coerced here
            // https://www.npmjs.com/package/ajv#coercing-data-types
            if (!validator(preConv)) {
                parseError(data, previous, validator.errors, count);
                readable.destroy();
                failed = true;
                return;
            }

            mutation += `{ ${objectIntoNamedFields(preConv)} },\n`;
            previous = preConv;
            count++;
        })
        .on('error', (err) => {
            if (failed)
                return;

            parseError(null, previous, err, count);
            readable.destroy();
            failed = true;
        })
        .on('end', () => {
            if (failed)
                return;

            const headers = {
                [auth.jwt_header]: req.headers[auth.jwt_header],
                "Content-Type": "application/graphql"
            };

            mutation += `]) { id } }`;

            doMutation(endpoint, mutation, headers)
                .then(([status, body]) => res.status(status).send(body))
                .catch(([status, body]) => res.status(status).send(body));
        });
};

const createHandle = (rawModel, verb, { endpoint, auth }) => {
    const model = new Model(castModel(rawModel));

    const validators = model.getEntities().reduce((validators, entity) => {
        validators[entity.getUrn()] = ajv.compile(entity.getSchema());
        return validators;
    }, {});

    return (req, res) => handle(req, res, { verb, endpoint, auth, model, validators });
};

module.exports = {
    getFormFields,
    createHandle,
};
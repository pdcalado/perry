import {
    EntitySpec,
    ID_FIELD,
    Attribute,
    DataObject,
    DataAny,
    DataPrimitive,
    RelationSide,
} from "./schemas";
import { Model, muri } from "./";
import { Node, Kind, Builder } from "./tree";
import { graphqlEntityTypeName } from "./naming";

type AnyMap = { [key: string]: DataAny | AnyMap };

export type WhereClause = string | AnyMap | MakeClause;

export type MakeClause = (options: Options) => string | AnyMap;

/**
 * RawInclude is used for filling in the include argument in a graphql
 * query function.
 * The include allows specifying `where` clauses based on values of related
 * objects. Include clauses can be nested.
 * The `key` must be the plural form of the related entity type.
 */
export type RawInclude = {
    [key: string]: {
        where: WhereClause;
        include?: RawInclude;
    }
};

// Any Entity or Attribute may have query params attached.
export type QueryParams = {
    byText?: boolean;
    customWhere?: WhereClause;
    rawInclude?: RawInclude;
};

export type Options = {
    textSearch?: string;
    page?: number;
    limit?: number;
    params?: Node<QueryParams>;
};

export enum Methods {
    // Queries
    TypeName,
    QueryOne,
    QueryMany,
    // Mutations
    CreateOne,
    CreateMany,
    UpdateOne,
    UpdateMany,
    DeleteOne,
    AddTo,
    RemoveFrom,
};

/**
 * Wraps braces around stringable tokens.
 */
class Braced {
    constructor(inner: Stringable) {
        this.inner = inner;
    }

    inner: Stringable;

    toString = (): string => `{ ${this.inner.toString()} }`;
}

/// A list of comma separated fields, each field can be a FieldSet, such as:
/// `label, vendor, categories { id, name }, stock`
class Fields {
    constructor(inner: (string | FieldSet)[]) {
        this.inner = inner;
    }

    inner: (string | FieldSet)[];

    toString = (): string => this.inner.map((o) => o.toString()).join(", ");
}

/// An ident (name) followed by a list of fields, such as:
/// `parts { label, vendor }`
class FieldSet {
    constructor(name: string, fields: Fields) {
        this.name = name;
        this.inBraces = new Braced(fields);
    }

    name: string;
    inBraces: Braced;

    toString = (): string => `${this.name} ${this.inBraces.toString()}`;
}

interface Stringable {
    toString: () => string;
}

/// A named field typically used in function arguments, such as:
/// `categories: anystring`
class NamedField {
    constructor(name: string, field: Stringable) {
        this.name = name;
        this.field = field;
    }

    name: string;
    field: Stringable;

    toString = () => `${this.name}: ${this.field.toString()}`;
}

/// A function call in the form:
/// `call( fieldA: valueA, fieldB: valueB )`
class Call {
    constructor(name: string, args: NamedField[] | string) {
        this.name = name;
        this.args = typeof args === "string" ? args : args.join(", ");
    }

    name: string;
    args: string;

    toString = () => `${this.name}( ${this.args} )`;
}

// Template call with offset, limit, where and include clause
const baseCall = (
    name: string,
    offset: number,
    limit: number,
    where?: string,
    include?: string,
) => {
    const args: NamedField[] = [
        new NamedField("offset", offset),
        new NamedField("limit", limit),
    ];

    if (where !== undefined && where.length > 0) {
        args.push(new NamedField("where", where));
    }

    if (include !== undefined && include.length > 0) {
        args.push(new NamedField("include", include));
    }

    return new Call(name, args);
};

const basicQuery = (prefix: string, fields: Fields): string => `{
    ${prefix} { ${fields.toString()} }
}`;

const parseWhere = (arg: WhereClause, options: Options): string => {
    switch (typeof arg) {
        case "string":
            return arg;
        case "function":
            const clause = arg(options);
            if (typeof clause === "string")
                return clause;
            return objectIntoNamedFields(clause);
        case "object":
            return objectIntoNamedFields(arg);
    }
};

const parseInclude = (raw: RawInclude, options: Options): string => {
    const fields = new Fields(Object.keys(raw).map(key => {
        const whereContents = new Braced(parseWhere(raw[key].where, options));
        const whereClause = new NamedField("where", whereContents);
        const clauses = [whereClause];
        const nested = raw[key].include;
        if (nested)
            clauses.push(new NamedField("include", parseInclude(nested, options)));
        const innerFields = new Fields(clauses.map(s => s.toString()));
        const entry = new NamedField(key, new Braced(innerFields));
        return entry.toString();
    }));

    return (new Braced(fields)).toString();
};

const intoIncludeClause = (
    node: Node<QueryParams>,
    options: Options
): string | undefined => {
    const raw = node.inner.rawInclude;
    if (!raw || Object.keys(raw).length === 0)
        return undefined;

    return parseInclude(raw, options);
};

const textLikeClause = (fieldName: string, text: string) => {
    return `${fieldName}: { like: "%${text}%" }`;
};

const intoWhereClause = (
    node: Node<QueryParams>,
    options: Options
): string | undefined => {
    const whereText = whereTextSearch(node, options.textSearch || "");
    const custom = whereCustom(node, options);
    if (whereText && !custom)
        return `{ or: { ${whereText} } }`;
    if (whereText && custom)
        return `{ and: { or: { ${whereText} }, ${custom} } }`;
    if (custom)
        return `{ ${custom} }`;
    return undefined;
};

const whereCustom = (
    node: Node<QueryParams>,
    options: Options
): string | undefined => {
    return node.inner.customWhere && parseWhere(node.inner.customWhere, options);
};

const whereTextSearch = (
    node: Node<QueryParams>,
    text: string
): string | undefined => {
    if (node.kind !== Kind.Entity) {
        throw new Error("where clause can only use EntitySpec");
    }

    // If node does not have attributes as a child,
    // then no where clause is created.
    if (!node.children.length) return undefined;

    // text searchable attributes
    const attributes = node.children[0].children.filter((n) => n.inner.byText);

    if (!attributes.length) return undefined;

    return attributes
        .map((a) => (a.reference as Attribute).id)
        .map((id) => textLikeClause(id, text))
        .join(", ");
};

const intoCall = (node: Node<QueryParams>, options: Options): Call => {
    return baseCall(
        (node.reference as EntitySpec).getPlural(),
        0,
        options.limit || 5,
        intoWhereClause(node, options),
        intoIncludeClause(node, options)
    );
};

// Assumes the node kind is Entity.
// Entity may be queried with a call, such as:
// parts (limit: 5, offset: 0) { ... }
// or as a FieldSet, such as
// parts { ... }
// This depends on the relation with parent entity.
const entityIntoFields = (
    node: Node<QueryParams>,
    options: Options
): Fields => {
    const entity = node.reference as EntitySpec;
    const relation = node.relationWithParent;

    let withQuery = false;
    let withSingular = false;

    if (relation) {
        const side = relation.getSide(entity.getUrn());
        withQuery = side === RelationSide.ManyToOne;
        withSingular = side === RelationSide.OneToMany;
    }

    const name = withQuery
        ? intoCall(node, options).toString()
        : withSingular
            ? entity.getSingular()
            : entity.getPlural();

    const fields = node.children.map((n) => intoFields(n, options).toString());
    const fieldSet = new FieldSet(name, new Fields(fields));
    return new Fields([fieldSet]);
};

const intoFields = (node: Node<QueryParams>, options: Options): Fields => {
    switch (node.kind) {
        case Kind.Attributes:
            return new Fields(
                node.children.map((n) => (n.reference as Attribute).id)
            );
        case Kind.Entity:
            return entityIntoFields(node, options);
        case Kind.Attribute:
            throw new Error("must not call with attribute");
    }
};

// Converts an arbitrary object into a list of named fields.
// For instance:
// { "foo": "bar", "qux": 2 }
// becomes:
// { foo: "bar", qux: 2 }
export const objectIntoNamedFields = (
    object: AnyMap
): string => Object.keys(object).map(field => {
    let value = String(object[field]);

    switch (typeof object[field]) {
        case "string":
            value = JSON.stringify(value);
            break;
        case "object":
            if (object[field] === null || object[field] === undefined) {
                value = "null";
                break;
            }

            if (Array.isArray(object[field])) {
                const array = (object[field] as Array<AnyMap | DataAny>)
                    .map(obj => {
                        return (typeof obj === "object") ?
                            `{ ${objectIntoNamedFields(obj as AnyMap)} }` :
                            String(obj);
                    }).join(", ");
                value = `[ ${array} ]`;
            } else {
                value = `{ ${objectIntoNamedFields(object[field] as DataObject)} }`;
            }
            break;
    }

    return `${field}: ${value}`;
}).join(", ");

export class Resolver {
    readonly queryUrl: string;
    token: string;
    readonly model: Model;

    constructor(model: Model, queryUrl: string, token: string) {
        this.model = model;
        this.token = token;
        this.queryUrl = queryUrl;
    }

    setHeaders = (headers: Headers) => {
        headers.set("Authorization", "Bearer " + this.token);
        headers.set("Content-Type", "application/graphql");
    };

    bareRequest = (body: string, url: string): Request => {
        let headers = new Headers();
        this.setHeaders(headers);

        return new Request(url, {
            method: "POST",
            body,
            headers,
        });
    };

    bareQuery = (body: string): Request => this.bareRequest(body, this.queryUrl);

    // Build a query from the options
    createQuery = (options: Options): string => {
        if (!options.params) return "";

        const root = options.params;
        const rootEntity = root.reference as EntitySpec;
        const call = baseCall(
            rootEntity.getPlural(),
            0,
            options.limit || 5,
            intoWhereClause(root, options),
            intoIncludeClause(root, options)
        );

        const fields = root.children
            .map((n) => intoFields(n, options).toString())
            .join(", ");

        return basicQuery(call.toString(), new Fields([fields]));
    };

    // Root node in QueryParams must be Kind.Entity
    requestDataObjects = async (options: Options): Promise<QueryResponse> => {
        const query = this.createQuery(options);

        try {
            const result = await fetch(this.bareQuery(query));
            const asJson = await result.json();
            const dataObjects = asJson.data; //[entity.getPlural()];
            if (!dataObjects) {
                throw JSON.stringify(asJson.errors);
            }

            // Cannot validate here since the objects attributes
            // may not all be there.
            /* entity.validate(dataObjects); */
            return new QueryResponse(
                options,
                this.model,
                dataObjects,
                asJson.errors && new Error(JSON.stringify(asJson.errors))
            );
        } catch (error) {
            return new QueryResponse(
                options,
                this.model,
                undefined,
                new Error(error)
            );
        }
    };

    private mutateObject = async (
        verb: string,
        args: NamedField[],
        outputFields: Fields
    ) => {
        const call = new Call(verb, args);
        const withSubField = new FieldSet(call.toString(), outputFields);
        const fields = new Fields([withSubField.toString()])
        const query = new FieldSet("mutation", fields).toString();

        try {
            const result = await fetch(this.bareQuery(query));
            const asJson = await result.json();
            const dataObjects = asJson.data;
            if (!dataObjects) {
                throw JSON.stringify(asJson.errors);
            }

            return new MutationResponse(
                verb,
                dataObjects,
                asJson.errors && new Error(JSON.stringify(asJson.errors))
            );
        } catch (error) {
            return new MutationResponse(
                verb,
                undefined,
                new Error(error)
            );
        }
    };

    createObject = async (entity: EntitySpec, payload: DataObject) => {
        const namedFields = objectIntoNamedFields(payload);
        const args = [new NamedField("input", `[{ ${namedFields} }]`)];
        return this.mutateObject(
            `bulkCreate${graphqlEntityTypeName(entity)}`,
            args,
            new Fields([ID_FIELD])
        );
    }

    updateObject = async (entity: EntitySpec, payload: DataObject) => {
        const namedFields = objectIntoNamedFields(payload);
        const args = [new NamedField("input", `[{ ${namedFields} }]`)];
        return this.mutateObject(
            `bulkUpdate${graphqlEntityTypeName(entity)}`,
            args,
            new Fields([ID_FIELD])
        );
    };

    deleteObject = async (entity: EntitySpec, payload: DataObject) => {
        return this.mutateObject(
            `delete${graphqlEntityTypeName(entity)}`,
            [new NamedField("id", payload.id.toString())],
            new Fields(["success"])
        )
    };
}

const uriToJsonKeys = (node: Node<any>, uri: string): string[] => {
    if (uri.length === 0) return [];

    const parts = muri.split(uri);
    const keys: string[] = [];

    let cursor: Node<any>;

    parts.forEach((part, i) => {
        cursor = !i
            ? node
            : Builder.findByURI(cursor, muri.join(cursor.uri, part))!;
        switch (cursor.kind) {
            case Kind.Attribute:
                keys.push(part);
                break;
            case Kind.Attributes:
                break;
            case Kind.Entity:
                const entity = cursor.reference as EntitySpec;
                const relation = cursor.relationWithParent;
                if (!relation) {
                    keys.push(entity.getPlural());
                    break;
                }

                keys.push(
                    relation.getSide(entity.getUrn()) === RelationSide.OneToMany
                        ? entity.getSingular()
                        : entity.getPlural()
                );
                break;
        }
    });
    return keys;
};

export class QueryResponse {
    private readonly data?: { [key: string]: DataObject[] };
    private readonly error?: Error;
    private readonly model: Model;
    private readonly options: Options;

    constructor(
        options: Options,
        model: Model,
        data?: { [key: string]: DataObject[] } | undefined,
        error?: Error
    ) {
        this.data = data;
        this.error = error;
        this.options = options;
        this.model = model;
    }

    getParams = (): Node<QueryParams> | undefined => this.options.params;
    getError = (): Error | undefined => this.error;
    getData = (): { [key: string]: DataObject[] } | undefined => this.data;

    private indexObjectByKeys = (
        object: DataAny,
        keys: string[]
    ): DataPrimitive | DataPrimitive[] => {
        let result: DataAny = object;
        var i: number;
        for (i = 0; i < keys.length; i++) {
            result = (result as DataObject)[keys[i]];
            if (!result) return result as null | undefined;

            if (Array.isArray(result)) {
                const remaining = keys.slice(i + 1);
                return (result as DataObject[])
                    .map(
                        (item: DataObject) =>
                            this.indexObjectByKeys(
                                item,
                                remaining
                            )?.toString() as DataPrimitive
                    )
                    .join(", ");
            }
        }
        return result as DataPrimitive | DataPrimitive[];
    };

    indexByURIs = (uris: string[]): { [key: string]: DataAny } => {
        if (!this.data || !uris.length) return {};

        const data = this.data!;

        const root = muri.split(uris[0])[0];
        const entity = this.model.findEntityByUrn(root)!;
        const params = this.getParams()!;

        const objectList = data[entity.getPlural()];
        return objectList.reduce((indexed, object) => {
            indexed[object[ID_FIELD]] = uris.reduce((byURI, uri) => {
                const keys = uriToJsonKeys(params, uri);
                byURI[uri] = this.indexObjectByKeys(object, keys.slice(1));
                return byURI;
            }, {} as DataObject);
            return indexed;
        }, {} as { [key: string]: DataAny });
    };
};

export class MutationResponse {
    private readonly verb: string;
    private readonly data?: { [key: string]: DataAny };
    private readonly error?: Error;

    constructor(
        verb: string,
        data?: { [key: string]: DataObject[] } | undefined,
        error?: Error
    ) {
        this.verb = verb;
        this.data = data;
        this.error = error;
    }

    getError = (): Error | undefined => this.error;
    getData = (): { [key: string]: DataAny } | undefined => this.data;
};

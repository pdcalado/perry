'use strict';

const minimist = require('minimist');
const jsonServer = require('json-server');
const {
    generate_entity_schema,
    generate_relation_schema
} = require('@pdcalado/perrydl-wasm');
const path = require('path');

let args = minimist(process.argv.slice(2), {
    alias: {
        d: 'data',
        p: 'port',
        h: 'help',
        v: 'version',
        r: 'models',
        w: 'middleware'
    },
    default: {
        port: 5000,
        data: 'data.json',
        models: '/models',
        middleware: []
    }
});

const injectSchema = (obj, inject) => {
    obj.schema = inject(obj);
}

const injectSchemaInEntity = (obj) => {
    injectSchema(obj, generate_entity_schema);
}

const injectSchemaInRelation = (obj) => {
    injectSchema(obj, generate_relation_schema);
}

const injectSchemaInModel = (data) => {
    let output = Object.assign([], data);
    output.forEach(model => {
        if (model.entities) {
            model.entities.forEach(ent => injectSchemaInEntity(ent));
        }
        if (model.relations) {
            model.relations.forEach(rel => injectSchemaInRelation(rel));
        }
    });
    return output;
};

const server = jsonServer.create();
const router = jsonServer.router(args.data);

router.render = (req, res) => {
    if (req.path !== args.models) {
        res.jsonp(res.locals.data);
        return;
    }

    let data = injectSchemaInModel(res.locals.data);

    if (!req.query || !req.query.tenant || req.query.tenant === "") {
        res.jsonp(data);
        return;
    }

    if (!data.length) {
        res.status(404).jsonp({
            error: "no such rev"
        });
        return;
    }

    if (req.query.rev) {
        res.jsonp(data[0]);
        return;
    }

    data.sort((a, b) => {
        if (a.updated_at < b.updated_at) {
            return -1;
        }

        if (a.updated_at > b.updated_at) {
            return 1;
        }

        return 0;
    });

    res.jsonp(data[0]);
};

console.log("middlewares", args.middleware);
let middles = args.middleware ? (
    Array.isArray(args.middleware) ? args.middleware : [args.middleware])
    : [];

const middlewares = [
    ...jsonServer.defaults(),
    ...middles.map(m => require(path.resolve(m)))
];
server.use(middlewares);
server.use(router);
server.listen(args.port, () => {
    console.log('json-server is running');
});

'use strict';

const minimist = require('minimist');
const {
    Model
} = require('@pdcalado/perrydl-wasm');
const express = require('express');
const graphqlHTTP = require('express-graphql');
const cors = require('cors');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3');
const { buildSchemaFromDatabase } = require('./tuql/index.js');
const fs = require('fs');
const toml = require('toml');
const Backup = require('./backup');
const bulk = require('./bulk');
const EventBrokerClient = require('./events');

// Command line arguments
let args = minimist(process.argv.slice(2), {
    alias: {
        c: 'config'
    },
    default: {
        config: './config.toml'
    }
});

let config = toml.parse(fs.readFileSync(args.config, 'utf-8').toString());

const backup = new Backup({
    sqlite3: config.backup.sqlite3,
    urlFolder: config.backup.url,
    region: config.backup.region,
    extension: config.backup.extension,
    restoreFail: config.backup.fail_on_restore
});

const events = new EventBrokerClient(
    config.events.url,
    config.events.topic
);

const getUserFromRequest = (request) => {
    const defaultName = "<unknown>";
    const encoded = request.get(config.server.auth.jwt_header);
    if (!encoded) {
        return defaultName;
    }

    const buf = Buffer.from(encoded, 'base64');

    try {
        return JSON.parse(buf)[config.server.auth.jwt_user_claim] || defaultName;
    } catch {
        return defaultName;
    }
};

const copyHeadersFromRequest = (request) => {
    let headers = {};
    if (config.events.copy_headers && config.events.copy_headers.length) {
        config.events.copy_headers.forEach(key => {
            const value = request.get(key);
            if (value)
                headers[key] = value;
        });
    }
    return headers;
};

const eventReport = (entity, verb, ids, request) => {
    const urn = `${config.dupe.tenant}:${entity}/${verb}`;
    const payload = {
        ids,
        user: getUserFromRequest(request)
    };
    const metadata = copyHeadersFromRequest(request);
    events.produce(urn, Buffer.from(JSON.stringify(payload)), metadata);
};

// Status handling
const noData = {
    "status": "unavailable",
    "attempts": 0,
    "msg": "no data yet"
};
let status = { ...noData };
const setStatus = (obj) => {
    if (obj.msg && obj.msg !== status.msg) {
        console.log(`${obj.status || status.status}: ${obj.msg}`);
    }

    status = { ...status, ...obj };
};

// Model info handling
let snapshot = {
    perryModel: null,
    rawModel: null,
    fileDB: null
};
const setSnapshot = (obj) => {
    snapshot = { ...snapshot, ...obj };
};

const server = express();
server.use(cors());

const createDB = (dumpSql, output) => {
    try { fs.unlinkSync(output); } catch (_) { };

    let db = new sqlite3.Database(output);
    db.serialize(() => {
        let statements = dumpSql.split("\n");
        statements.forEach(stmt => db.run(stmt, (err) => err && console.error("stmt", stmt, "failed")));
    });
    return db;
};

// Start tuql on specific sqlite file.
const startTuql = (fileDB, model) => {
    buildSchemaFromDatabase(
        fileDB,
        model,
        eventReport
    )
        .then(({ schema }) => {
            setStatus({ status: "ready", msg: "tuql is up" });
            server.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

            const fields = bulk.getFormFields();
            const endpoint = `http://localhost:${config.server.port}/graphql`;
            server.post('/bulk/create',
                fields,
                bulk.createHandle(snapshot.rawModel, "create", {
                    endpoint,
                    auth: config.server.auth
                })
            );
            server.post('/bulk/update',
                fields,
                bulk.createHandle(snapshot.rawModel, "update", {
                    endpoint,
                    auth: config.server.auth
                })
            );
        })
        .catch(err => setStatus({ ...noData, msg: "tuql failed:" + err }));
};

// Periodically attempt to getModels
const getModels = async () => {
    try {
        const res = await fetch(config.dupe.models + "/models?tenant=" + config.dupe.tenant, {
            method: "GET",
            cache: 'no-cache',
            // spoof authorized requests (only works internally to the cluster)
            headers: {
                [config.server.auth.jwt_header]: '{"sub":"dupe"}'
            },
        });

        setStatus({ status: "initializing", msg: "model data obtained, parsing" });

        const rawModel = await res.json();
        setSnapshot({ rawModel: rawModel });

        let model = Model.from_object(rawModel);

        setSnapshot({ perryModel: model });

        setStatus({ status: "initializing", msg: "model ok, creating DB" });

        let fileDB = `/tmp/tmp_${Date.now()}.db`;

        let db = createDB(model.to_sql(), fileDB);
        const restoredFrom = await backup.restore(db);
        setStatus({ msg: restoredFrom });

        db.close((err) => {
            if (err) {
                setStatus({ status: "failure", msg: `failed to close DB: ${err}` });
                return;
            }

            setStatus({ msg: "db ok, waiting for tuql" });
            setSnapshot({ fileDB: fileDB });
            startTuql(fileDB, model);
        });
    } catch (err) {
        const attempts = status.attempts + 1;
        setStatus({ ...noData, msg: err.toString(), attempts });
        setTimeout(() => getModels(), config.server.retry);
    }
};

// Attempt to get models from API.
setTimeout(() => getModels(), 500);

// Set basic routes to get status and to reload schema.
server.get("/", (_, res) => res.send(status));

// Enable middleware
if (config.server.auth.enabled)
    server.use((req, res, next) => {
        const jwt = req.headers[config.server.auth.jwt_header];
        if (!jwt || jwt.length === 0) {
            res.status(401).send("unauthorized");
            return;
        }

        next();
    });

const doBackup = () => {
    backup.backup(snapshot.fileDB)
        .then((output) => {
            console.log(`backup successful to ${output}`);
            process.exit();
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
};

const shutdown = () => {
    if (config.dupe.backup_onexit) {
        doBackup();
    } else {
        process.exit();
    }
};

// Process termination handles
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.get("/snapshot", (_, res) => res.send(snapshot));
server.get("/shutdownBackup", (_, res) => {
    setStatus({ status: "closing", msg: "shutting down" });
    setTimeout(doBackup, 1000);
    res.send(status);
});

server.listen(config.server.port, () => console.log('dupe is running'));

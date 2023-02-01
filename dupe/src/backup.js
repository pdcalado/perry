const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Minio = require('minio');

const isS3 = (url) => url.startsWith("s3://");
const s3Endpoint = (url) => url.replace(/^s3:\/\//, '').split(':')[0];
const s3Port = (url) => url.replace(/^s3:\/\//, '').split(':')[1].split('/')[0];
const s3Bucket = (url) => url.split('/')[3];
const s3Prefix = (url) => url.split('/').slice(4).join('/');

const tokenCreate = "CREATE";
const tokenCreateTable = "CREATE TABLE";
const tokenForeignKey = "FOREIGN KEY";
const tokenUnique = "Unique";
const tokenInsertInto = "INSERT INTO";
const tokenValues = "VALUES";

/**
 * Get the column names from a CREATE TABLE statement.
 * @param {} name Name of the table
 * @param {} statement Create table SQL statement as text
 */
const columnsFromCreateTable = (name, statement) => {
    let columns = [];
    const args = statement.slice(
        `${tokenCreateTable} ${name}(`.length,
        statement.indexOf(");")
    ).split(", ");
    for (let line of args) {
        if (line.startsWith(tokenForeignKey) || line.startsWith(tokenUnique))
            break;
        // get the name of the column right before the first space " "
        columns.push(line.slice(0, line.indexOf(" ")));
    }
    return columns;
};

/**
 * Identify the columns being inserted for every table and inject them
 * as column names on all INSERT statements.
 * 
 * Turns the following:
 * ```sql
 * INSERT INTO people VALUES("john", "doe");
 * ```
 * 
 * into:
 * 
 * ```sql
 * INSERT INTO (name,lastname) people VALUES("john", "doe");
 * ```
 * 
 * sqlite3 cannot do this for us.
 * This allows us migrate easily when some columns are added.
 * 
 * @param {} dumpSql All sql statements as text
 */
const prefilterSqlDump = (dumpSql) => {
    let delim = "\n";

    let tables = {};
    let statements = dumpSql
        .split(delim)
        .filter(line => {
            // Ignore any create statement
            if (line.startsWith(tokenCreate)) {
                // Grab the name of the table:
                // `CREATE TABLE <table_name>(...`
                if (line.startsWith(tokenCreateTable)) {
                    const tableName = line.slice(
                        tokenCreateTable.length + 1,
                        line.indexOf("(")
                    );
                    tables[tableName] = columnsFromCreateTable(tableName, line);
                }
                return false;
            }
            return true;
        })
        .map(line => line.trim())
        .filter(line => line.length);

    return statements
        .map(statement => {
            const prefix = `${tokenInsertInto} `;
            if (statement.startsWith(prefix)) {
                let name = statement.slice(
                    prefix.length,
                    statement.indexOf(` ${tokenValues}(`)
                );
                if (name in tables) {
                    let newStmt = `${tokenInsertInto} ${name} (${tables[name].join(",")})` + statement.slice(statement.indexOf(` ${tokenValues}(`));
                    return newStmt;
                }
            }
            return statement;
        });
};

class Backup {
    constructor({
        sqlite3,
        urlFolder,
        region,
        extension,
        restoreFail }) {
        this.sqlite3 = sqlite3;
        this.urlFolder = urlFolder;
        this.region = region;
        this.extension = extension;
        this.restoreFail = restoreFail;

        if (!isS3(this.urlFolder))
            return;

        const endPoint = s3Endpoint(this.urlFolder);
        const port = parseInt(s3Port(this.urlFolder)) || 80;

        this.client = new Minio.Client({
            endPoint,
            port,
            useSSL: false,
            accessKey: process.env["AWS_ACCESS_KEY_ID"],
            secretKey: process.env["AWS_SECRET_ACCESS_KEY"],
        });
    }

    getLatestFile = () => {
        let files = fs.readdirSync(this.urlFolder);
        let stats = files
            .filter(file => file.endsWith(this.extension))
            .map(file => Object.assign({
                file,
                ctime: fs.statSync(path.join(this.urlFolder, file)).ctime,
            }, {}));
        const latest = stats.sort((a, b) => b.ctime - a.ctime)[0];
        return latest && latest.file;
    };

    getLatestS3 = () => {
        let stream = this.client.extensions.listObjectsV2WithMetadata(
            s3Bucket(this.urlFolder),
            s3Prefix(this.urlFolder),
            true
        );

        let objects = [];
        let compare = (a, b) => b.lastModified - a.lastModified;

        return new Promise((resolve) => {
            stream.on(
                'data',
                (obj) => obj.name.endsWith(this.extension) && objects.push(obj)
            );
            stream.on(
                'end',
                () => resolve(objects.sort(compare)[0])
            );
        });
    };

    getDump = async () => {
        // Restore from S3
        if (!isS3(this.urlFolder)) {
            const latest = this.getLatestFile();
            if (!latest)
                return Promise.resolve(null);

            this.restoredFrom = latest;
            return Promise.resolve(fs.readFileSync(latest, 'utf-8').toString());
        }

        const latest = await this.getLatestS3();
        this.restoredFrom = latest.name;
        const tmpname = `/tmp/s3_tmp_read_${Date.now()}.sql`;
        return new Promise((resolve, reject) => {
            this.client.fGetObject(
                s3Bucket(this.urlFolder),
                latest.name,
                tmpname,
                (err) => err && reject(err) || resolve(fs.readFileSync(tmpname, 'utf-8').toString())
            );
        });
    };

    restore = async (db) => {
        let dumpSql = "";
        try {
            dumpSql = await this.getDump();
        } catch (err) {
            const msg = `restore backup failed: ${err}`;
            return this.restoreFail ? Promise.reject(msg) : Promise.resolve(msg);
        }

        if (!dumpSql)
            return Promise.resolve("no file to restore from");

        db.serialize(() => {
            const statements = prefilterSqlDump(dumpSql);
            statements
                .forEach(statement => db.run(
                    statement,
                    (err) => err && console.error(`backup stmt '${statement}' failed: ${err}`)
                )
                );
        });
        return Promise.resolve(`restored from ${this.restoredFrom}`);
    };

    writeBackup = async (dump, file) => new Promise((resolve, reject) => {
        const report = (err) => err && reject(err) || resolve(file);
        if (!isS3(this.urlFolder)) {
            fs.copyFile(dump, file, report);
        } else {
            this.client.fPutObject(s3Bucket(this.urlFolder), s3Prefix(file), dump, report);
        }
    });

    backup = async (fileDB) => {
        const dumpTo = `${this.urlFolder}/${Date.now()}${this.extension}`;
        const dumpContents = path.join("/tmp", path.basename(dumpTo));

        return new Promise((resolve, reject) => {
            exec(`${this.sqlite3} ${fileDB} .dump > ${dumpContents}`, (error, stderr) => {
                if (error) {
                    return reject(new Error(`backup failed: ${error}\n${stderr}`));
                }

                this.writeBackup(dumpContents, dumpTo)
                    .then((output) => resolve(output))
                    .catch((err) => reject(err));
            });
        });
    };
}

module.exports = Backup;

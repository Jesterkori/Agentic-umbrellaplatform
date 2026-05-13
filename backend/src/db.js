const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.SQLITE_PATH || path.resolve(__dirname, "../../database/payroll.sqlite");
const schemaPath = path.resolve(__dirname, "../../database/schema.sqlite.sql");
const seedPath = path.resolve(__dirname, "../../database/seed.sqlite.sql");

const db = new sqlite3.Database(dbPath);

function toSql(sql, params = []) {
  const values = [];
  const statement = sql.replace(/\$(\d+)/g, (_match, rawIndex) => {
    const index = Number(rawIndex) - 1;
    values.push(params[index]);
    return "?";
  });
  return { sql: statement, params: values };
}

function run(sql, params = []) {
  const { sql: stmt, params: values } = toSql(sql, params);
  return new Promise((resolve, reject) => {
    db.run(stmt, values, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function query(sql, params = []) {
  const { sql: stmt, params: values } = toSql(sql, params);
  return new Promise((resolve, reject) => {
    const trimmed = stmt.trim().toUpperCase();
    if (trimmed.startsWith("SELECT")) {
      db.all(stmt, values, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
      return;
    }
    db.run(stmt, values, function onRun(err) {
      if (err) reject(err);
      else resolve({ rows: [], lastID: this.lastID, changes: this.changes });
    });
  });
}

async function execScript(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function initDb() {
  await execScript(schemaPath);
  await execScript(seedPath);
}

module.exports = { db, query, run, initDb };

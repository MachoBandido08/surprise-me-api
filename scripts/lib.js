import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sqlite3 from 'sqlite3';

// Shared helpers for the data scripts in this folder.

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'drinks_database.db');

// Scripts only look unless run with --apply, so a mistake can't change the data.
export const APPLY = process.argv.includes('--apply');

export function openDb() {
    const db = new sqlite3.Database(DB_PATH);
    return {
        all: (sql, params = []) =>
            new Promise((resolve, reject) =>
                db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
            ),
        run: (sql, params = []) =>
            new Promise((resolve, reject) =>
                db.run(sql, params, (err) => (err ? reject(err) : resolve())),
            ),
        close: () => new Promise((resolve) => db.close(resolve)),
    };
}

// Runs `changes` inside one transaction, so a failure leaves the data untouched.
export async function inTransaction(db, changes) {
    await db.run('begin');
    try {
        await changes();
        await db.run('commit');
    } catch (err) {
        await db.run('rollback');
        throw err;
    }
}

export function printSummary(count, noun) {
    if (count === 0) console.log(`Nothing to change: no ${noun} need fixing.`);
    else if (APPLY) console.log(`Updated ${count} ${noun}.`);
    else console.log(`${count} ${noun} would change. Run again with --apply to write them.`);
}

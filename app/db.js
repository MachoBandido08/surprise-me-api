import sqlite3 from "sqlite3";

const db = new sqlite3.Database('./drinks_database.db', (err) => {
    if (err) {
        console.error('Failed to open database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the drinks database.');
});

// Promise wrapper so route handlers can use async/await instead of nesting
// callbacks. Rejections propagate to the central error handler.
export const dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

// Close the connection cleanly on shutdown.
export const closeDb = () =>
    new Promise((resolve) => {
        db.close((err) => {
            if (err) console.error('Error closing database:', err.message);
            else console.log('Closed database connection.');
            resolve();
        });
    });

import sqlite3 from "sqlite3";
import express from "express";
import cors from "cors";
import {regroupIngredientsToDrinkJSON} from "./app/DrinksUtilitaires.js";

const app = express();
const port = process.env.PORT || 3000;

// --- Database ---------------------------------------------------------------

const db = new sqlite3.Database('./drinks_database.db', (err) => {
    if (err) {
        console.error('Failed to open database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the drinks database.');
});

// Promise wrapper so route handlers can use async/await instead of nesting
// callbacks. Rejections propagate to the central error handler.
const dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

// Wrap async handlers so a rejected promise always reaches the error handler.
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// --- Middleware -------------------------------------------------------------

app.use(cors());
app.use(express.json());

// Log each request once it finishes: method, path, status, duration.
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

// --- Routes -----------------------------------------------------------------

app.get('/status', (req, res) => {
    res.send({Status: 'Running'});
});

// GET all drinks (raw rows) — kept as a simple test/debug endpoint.
app.get('/drinks', asyncHandler(async (req, res) => {
    const rows = await dbAll('SELECT * FROM Drink');
    res.send(rows);
}));

// GET drinks that can be made from the given comma-separated ingredients.
app.get('/drinks/:ingredients', asyncHandler(async (req, res) => {
    const ingredients = req.params.ingredients
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

    // Validate input before touching the database.
    if (ingredients.length === 0) {
        return res.status(400).send({error: 'Provide at least one ingredient.'});
    }
    if (ingredients.length > 20) {
        return res.status(400).send({error: 'Too many ingredients (max 20).'});
    }
    if (ingredients.some(i => i.length > 60)) {
        return res.status(400).send({error: 'Ingredient names are too long (max 60 characters).'});
    }

    // Placeholders keep ingredient values out of the SQL text. Order by drink
    // id so rows for the same drink arrive contiguously, as the regrouping
    // step relies on that.
    const conditions = ingredients.map(() => 'DI2.ingredient not like ?').join(' and ');
    const sql =
        'select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id ' +
        'where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where ' +
        conditions + ') order by D.id';
    const params = ingredients.map(ing => '%' + ing + '%');

    const rows = await dbAll(sql, params);
    if (rows.length === 0) {
        return res.send([]);
    }

    const drinks = regroupIngredientsToDrinkJSON(rows);
    // The dataset contains duplicate drinks (same content, different id);
    // collapse them so each cocktail appears once.
    const seen = new Set();
    const unique = drinks.filter(d => {
        const signature = d.name + '|' + d.instructions;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });
    res.send(unique);
}));

// --- 404 + error handling ---------------------------------------------------

app.use((req, res) => {
    res.status(404).send({error: 'Not found'});
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack || err.message);
    res.status(500).send({error: 'Internal server error'});
});

// --- Start + graceful shutdown ----------------------------------------------

const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
});

const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
        db.close((err) => {
            if (err) console.error('Error closing database:', err.message);
            else console.log('Closed database connection.');
            process.exit(0);
        });
    });
    // Force exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

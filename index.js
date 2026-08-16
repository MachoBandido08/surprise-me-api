import sqlite3 from "sqlite3";
import express from "express";
import cors from "cors";
import {regroupIngredientsToDrinkJSON} from "./app/DrinksUtilitaires.js";
import {isPantry} from "./app/pantry.js";

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

// How many missing ingredients a partially-makeable drink may still have
// before we stop showing it, and the cap on how many partials we return.
const MAX_MISSING = 2;
const MAX_PARTIAL = 30;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET drinks that can be made from the given comma-separated ingredients.
// Returns drinks the user can fully make first, then close partial matches
// (missing a couple of ingredients), each annotated with what's missing.
app.get('/drinks/:ingredients', asyncHandler(async (req, res) => {
    const ingredients = req.params.ingredients
        .split(',')
        .map(i => i.trim().toLowerCase())
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

    // Candidate drinks: those with at least one ingredient the user has.
    // Placeholders keep values out of the SQL text; order by drink id so rows
    // for the same drink arrive contiguously (the regrouping relies on that).
    const likeClauses = ingredients.map(() => 'ingredient like ?').join(' or ');
    const sql =
        'select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id ' +
        'where D.id in (select distinct drink_id from Drink_Ingredient where ' +
        likeClauses + ') order by D.id';
    const params = ingredients.map(ing => '%' + ing + '%');

    const rows = await dbAll(sql, params);
    if (rows.length === 0) {
        return res.send([]);
    }

    let drinks = regroupIngredientsToDrinkJSON(rows);

    // Collapse duplicate drinks (same content, different id).
    const seen = new Set();
    drinks = drinks.filter(d => {
        const signature = d.name + '|' + d.instructions;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });

    // A drink ingredient counts as owned if one of the user's ingredients
    // matches it as a whole word — so "gin" matches "Gin" but not "oriGINal"
    // or "GINger". The SQL LIKE above is a coarse pre-filter; this is precise.
    const termRegexes = ingredients.map(t => new RegExp('\\b' + escapeRegex(t) + '\\b', 'i'));
    const userOwns = (name) => termRegexes.some(re => re.test(name || ''));

    for (const d of drinks) {
        let owned = 0;
        d.missing = [];
        for (const ing of d.ingredients) {
            if (userOwns(ing.name)) {
                owned++;              // the user actually listed this
            } else if (!isPantry(ing.name)) {
                d.missing.push(ing.name); // real gap (pantry staples are assumed)
            }
        }
        d.owned = owned;
        d.makeable = d.missing.length === 0;
    }

    // Keep only drinks the user genuinely owns an ingredient of — a pantry
    // staple alone (and LIKE pre-filter false positives) don't count.
    drinks = drinks.filter(d => d.owned > 0);

    // Fully makeable first (alphabetical), then the closest partial matches.
    const makeable = drinks
        .filter(d => d.makeable)
        .sort((a, b) => a.name.localeCompare(b.name));
    const partial = drinks
        .filter(d => !d.makeable && d.missing.length <= MAX_MISSING)
        .sort((a, b) => a.missing.length - b.missing.length || a.name.localeCompare(b.name))
        .slice(0, MAX_PARTIAL);

    res.send([...makeable, ...partial]);
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

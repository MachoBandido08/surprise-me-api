import express from "express";
import {dbAll} from "./db.js";
import {regroupIngredientsToDrinkJSON} from "./DrinksUtilitaires.js";
import {isGarnish, isPantry} from "./pantry.js";
import {config} from "./config.js";

const {maxMissing, maxPartial, maxIngredients, maxIngredientLength} = config.search;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const router = express.Router();

router.get('/status', (req, res) => {
    res.send({Status: 'Running'});
});

// GET all drinks (raw rows) — kept as a simple test/debug endpoint.
router.get('/drinks', async (req, res) => {
    const rows = await dbAll('SELECT * FROM Drink');
    res.send(rows);
});

// GET drinks that can be made from the given comma-separated ingredients.
// Returns drinks the user can fully make first, then close partial matches
// (missing a couple of ingredients), each annotated with what's missing.
router.get('/drinks/:ingredients', async (req, res) => {
    const ingredients = req.params.ingredients
        .split(',')
        .map(i => i.trim().toLowerCase())
        .filter(Boolean);

    // Validate input before touching the database.
    if (ingredients.length === 0) {
        return res.status(400).send({error: 'Provide at least one ingredient.'});
    }
    if (ingredients.length > maxIngredients) {
        return res.status(400).send({error: `Too many ingredients (max ${maxIngredients}).`});
    }
    if (ingredients.some(i => i.length > maxIngredientLength)) {
        return res.status(400).send({error: `Ingredient names are too long (max ${maxIngredientLength} characters).`});
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
            } else if (!isPantry(ing.name) && !isGarnish(ing.name)) {
                d.missing.push(ing.name); // real gap (pantry staples and garnishes are optional)
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
        .filter(d => !d.makeable && d.missing.length <= maxMissing)
        .sort((a, b) => a.missing.length - b.missing.length || a.name.localeCompare(b.name))
        .slice(0, maxPartial);

    res.send([...makeable, ...partial]);
});

export default router;

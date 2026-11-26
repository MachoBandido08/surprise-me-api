import express from 'express';
import {findDrinksByName, findDrinksWithAnyIngredient, getAllDrinks} from './drinkRepo.js';
import {
    parseIngredients,
    rankByName,
    rankDrinks,
    validateIngredients,
    validateName,
} from './search.js';

// HTTP layer only: read the request, call the repository and the search
// logic, send the response. No SQL and no ranking rules here.
const router = express.Router();

router.get('/status', (req, res) => {
    res.send({Status: 'Running'});
});

// GET all drinks (raw rows) — kept as a simple test/debug endpoint.
router.get('/drinks', async (req, res) => {
    res.send(await getAllDrinks());
});

// GET recipes by drink name, e.g. /recipes?name=margarita
router.get('/recipes', async (req, res) => {
    const name = String(req.query.name ?? '').trim();

    const error = validateName(name);
    if (error) return res.status(400).send({error});

    res.send(rankByName(await findDrinksByName(name), name));
});

// GET drinks that can be made from the given comma-separated ingredients:
// fully makeable drinks first, then close partial matches with what's missing.
router.get('/drinks/:ingredients', async (req, res) => {
    const ingredients = parseIngredients(req.params.ingredients);

    const error = validateIngredients(ingredients);
    if (error) return res.status(400).send({error});

    const candidates = await findDrinksWithAnyIngredient(ingredients);
    res.send(rankDrinks(candidates, ingredients));
});

export default router;

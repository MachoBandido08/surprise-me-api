import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    dedupeDrinks,
    parseIngredients,
    rankDrinks,
    scoreDrink,
    validateIngredients,
} from '../app/search.js';
import {makeOwnsMatcher} from '../app/matching.js';

// Plain drink objects: no server and no database needed.
const drink = (name, ...ingredients) => ({
    id: name,
    name,
    image_example: '',
    instructions: `Make ${name}`,
    ingredients: ingredients.map((n) => ({name: n, quantity: '1 oz'})),
});

const limits = {maxIngredients: 3, maxIngredientLength: 10};

test('parseIngredients: trims, lowercases and drops empty entries', () => {
    assert.deepEqual(parseIngredients(' Gin, Dry Vermouth ,,'), ['gin', 'dry vermouth']);
});

test('validateIngredients: accepts a normal list', () => {
    assert.equal(validateIngredients(['gin'], limits), null);
});

test('validateIngredients: rejects empty, too many and too long', () => {
    assert.match(validateIngredients([], limits), /at least one/);
    assert.match(validateIngredients(['a', 'b', 'c', 'd'], limits), /max 3/);
    assert.match(validateIngredients(['a'.repeat(11)], limits), /too long/);
});

test('dedupeDrinks: drops drinks with the same name and instructions', () => {
    const a = drink('Martini', 'Gin');
    const copy = {...a, id: 'other-id'};
    assert.deepEqual(dedupeDrinks([a, copy]), [a]);
});

test('scoreDrink: pantry staples and garnishes are never missing', () => {
    const scored = scoreDrink(
        drink('Martini', 'Gin', 'Dry Vermouth', 'Ice', 'Olive'),
        makeOwnsMatcher(['gin']),
    );
    assert.equal(scored.owned, 1);
    assert.deepEqual(scored.missing, ['Dry Vermouth']);
    assert.equal(scored.makeable, false);
});

test('scoreDrink: does not change the original drink', () => {
    const original = drink('Gin Rickey', 'Gin');
    scoreDrink(original, makeOwnsMatcher(['gin']));
    assert.equal('missing' in original, false);
});

test('rankDrinks: makeable drinks first (A-Z), then partials by fewest missing', () => {
    const result = rankDrinks(
        [
            drink('Zed', 'Gin'),
            drink('Two Short', 'Gin', 'Campari', 'Sweet Vermouth'),
            drink('Alpha', 'Gin', 'Ice'),
            drink('One Short', 'Gin', 'Campari'),
        ],
        ['gin'],
        {maxMissing: 2, maxPartial: 30},
    );
    assert.deepEqual(
        result.map((d) => d.name),
        ['Alpha', 'Zed', 'One Short', 'Two Short'],
    );
});

test('rankDrinks: drops drinks the user owns nothing of (LIKE false positives)', () => {
    const result = rankDrinks([drink('Moscow Mule', 'Vodka', 'Ginger beer')], ['gin']);
    assert.deepEqual(result, []);
});

test('rankDrinks: respects maxMissing and maxPartial', () => {
    const drinks = [
        drink('Far', 'Gin', 'A', 'B', 'C'),
        drink('Near 1', 'Gin', 'A'),
        drink('Near 2', 'Gin', 'B'),
    ];
    const result = rankDrinks(drinks, ['gin'], {maxMissing: 2, maxPartial: 1});
    assert.deepEqual(
        result.map((d) => d.name),
        ['Near 1'],
    );
});

test('rankDrinks: empty input gives an empty list', () => {
    assert.deepEqual(rankDrinks([], ['gin']), []);
});

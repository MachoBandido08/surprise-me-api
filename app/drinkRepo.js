import {dbAll} from './db.js';
import {regroupIngredientsToDrinkJSON} from './DrinksUtilitaires.js';

// Repository: the only place that knows the SQL and the table layout.
// Everything else works with plain drink objects:
//   {id, name, image_example, instructions, ingredients: [{name, quantity}]}
// Swapping the database later only means rewriting this file.

// Raw rows of the Drink table (used by the GET /drinks debug endpoint).
export function getAllDrinks() {
    return dbAll('SELECT * FROM Drink');
}

// Drinks that have at least one ingredient containing one of the given terms.
// This is a coarse pre-filter (LIKE '%gin%' also matches "ginger"); the
// precise whole-word matching happens in search.js.
export async function findDrinksWithAnyIngredient(terms) {
    if (terms.length === 0) return [];

    // Placeholders keep the values out of the SQL text.
    const likeClauses = terms.map(() => 'ingredient like ?').join(' or ');
    const sql =
        'select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id ' +
        'where D.id in (select distinct drink_id from Drink_Ingredient where ' +
        likeClauses +
        ') order by D.id';
    const params = terms.map((term) => '%' + term + '%');

    const rows = await dbAll(sql, params);
    return regroupIngredientsToDrinkJSON(rows);
}

// Drinks whose name contains the given text (case-insensitive). % and _ in the
// user's text are escaped so they match literally instead of acting as wildcards.
export async function findDrinksByName(text) {
    const pattern = '%' + text.replace(/[!%_]/g, (c) => '!' + c) + '%';
    const sql =
        'select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id ' +
        "where D.name like ? escape '!' order by D.id";
    const rows = await dbAll(sql, [pattern]);
    return regroupIngredientsToDrinkJSON(rows);
}

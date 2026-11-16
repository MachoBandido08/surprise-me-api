import {toDrink, toIngredient} from "./mappers.js";

// Turns flat rows (one per drink + ingredient) into one object per drink.
// Grouped by id, so it doesn't matter how the rows are ordered.
export function regroupIngredientsToDrinkJSON(data) {
    const drinks = new Map();

    for (const row of data) {
        if (!drinks.has(row.id)) {
            drinks.set(row.id, toDrink(row));
        }
        drinks.get(row.id).ingredients.push(toIngredient(row));
    }

    return [...drinks.values()];
}

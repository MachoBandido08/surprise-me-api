import {test} from "node:test";
import assert from "node:assert/strict";
import {toDrink, toIngredient} from "../app/mappers.js";

test("toDrink: keeps only the API fields and starts with no ingredients", () => {
    const drink = toDrink({
        id: "1", name: "Daiquiri", image_example: "d.jpg", instructions: "Shake.",
        drink_id: "1", ingredient: "Rum", quantity: "2 oz",
    });
    assert.deepEqual(drink, {
        id: "1", name: "Daiquiri", image_example: "d.jpg", instructions: "Shake.", ingredients: [],
    });
});

test("toIngredient: renames the 'ingredient' column to 'name'", () => {
    assert.deepEqual(
        toIngredient({id: "1", ingredient: "Rum", quantity: "2 oz"}),
        {name: "Rum", quantity: "2 oz"}
    );
});

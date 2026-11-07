import {test} from "node:test";
import assert from "node:assert/strict";
import {regroupIngredientsToDrinkJSON} from "../app/DrinksUtilitaires.js";

const row = (id, name, ingredient, quantity) => ({
    id, name, image_example: `${name}.jpg`, instructions: `Make ${name}`, ingredient, quantity,
});

test("regroupIngredientsToDrinkJSON: groups contiguous rows into one drink each", () => {
    const drinks = regroupIngredientsToDrinkJSON([
        row("1", "Daiquiri", "Rum", "2 oz"),
        row("1", "Daiquiri", "Lime juice", "1 oz"),
        row("2", "Martini", "Gin", "2 oz"),
    ]);

    assert.equal(drinks.length, 2);
    assert.deepEqual(drinks[0].ingredients, [
        {name: "Rum", quantity: "2 oz"},
        {name: "Lime juice", quantity: "1 oz"},
    ]);
    assert.equal(drinks[1].name, "Martini");
    assert.deepEqual(drinks[1].ingredients, [{name: "Gin", quantity: "2 oz"}]);
});

test("regroupIngredientsToDrinkJSON: keeps drink fields", () => {
    const [drink] = regroupIngredientsToDrinkJSON([row("1", "Daiquiri", "Rum", "2 oz")]);
    assert.equal(drink.id, "1");
    assert.equal(drink.image_example, "Daiquiri.jpg");
    assert.equal(drink.instructions, "Make Daiquiri");
});

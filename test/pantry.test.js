import {test} from "node:test";
import assert from "node:assert/strict";
import {isGarnish, isPantry} from "../app/pantry.js";

test("isPantry: staples and their harmless variants pass", () => {
    for (const name of ["Salt", "Sea Salt", "Ice", "Crushed Ice", "Sugar", "Lime Juice", "Egg White", "Black Pepper"]) {
        assert.equal(isPantry(name), true, name);
    }
});

test("isPantry: compound ingredients that merely contain a staple do not pass", () => {
    for (const name of ["Tonic Water", "Ice Cream", "Lime Vodka", "Dr. Pepper", "Gin", ""]) {
        assert.equal(isPantry(name), false, name);
    }
});

test("isPantry: handles missing input", () => {
    assert.equal(isPantry(undefined), false);
    assert.equal(isPantry(null), false);
});

test("isGarnish: olives, cherries and citrus garnishes pass", () => {
    for (const name of [
        "Olive", "Olives", "Maraschino Cherries", "Maraschino cherry", "Cocktail onion",
        "Lemon Twist", "Orange Peel", "Orange Slice", "Pineapple Wedge", "Mint Sprig",
        "Nutmeg", "Cinnamon Stick",
    ]) {
        assert.equal(isGarnish(name), true, name);
    }
});

test("isGarnish: real ingredients that share a word do not pass", () => {
    for (const name of [
        "Cherry Brandy", "Cherry Schnapps", "Black Cherry Rum", "Olive Oil", "Lemon Juice",
        "Orange Bitters", "Cinnamon Syrup", "Lemon", "Mint", "Fresh Mint Leaves", "Gin",
    ]) {
        assert.equal(isGarnish(name), false, name);
    }
});

test("isGarnish: handles missing input", () => {
    assert.equal(isGarnish(undefined), false);
    assert.equal(isGarnish(""), false);
});

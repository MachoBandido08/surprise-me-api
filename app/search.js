import {isGarnish, isPantry} from './pantry.js';
import {makeOwnsMatcher} from './matching.js';
import {config} from './config.js';

// Search logic: pure functions with no HTTP and no database, so they can be
// tested with plain arrays.

// "Gin, Dry Vermouth ,," -> ['gin', 'dry vermouth']
export function parseIngredients(text) {
    return text
        .split(',')
        .map((i) => i.trim().toLowerCase())
        .filter(Boolean);
}

// Returns an error message, or null when the list is acceptable.
export function validateIngredients(ingredients, limits = config.search) {
    const {maxIngredients, maxIngredientLength} = limits;
    if (ingredients.length === 0) return 'Provide at least one ingredient.';
    if (ingredients.length > maxIngredients) return `Too many ingredients (max ${maxIngredients}).`;
    if (ingredients.some((i) => i.length > maxIngredientLength)) {
        return `Ingredient names are too long (max ${maxIngredientLength} characters).`;
    }
    return null;
}

// Collapses duplicate drinks (same content, different id).
export function dedupeDrinks(drinks) {
    const seen = new Set();
    return drinks.filter((d) => {
        const signature = d.name + '|' + d.instructions;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });
}

// Annotates a drink with what the user owns and what is missing.
// Pantry staples and garnishes are never counted as missing.
export function scoreDrink(drink, userOwns) {
    let owned = 0;
    const missing = [];
    for (const ing of drink.ingredients) {
        if (userOwns(ing.name)) owned++;
        else if (!isPantry(ing.name) && !isGarnish(ing.name)) missing.push(ing.name);
    }
    return {...drink, owned, missing, makeable: missing.length === 0};
}

// Candidate drinks + the user's ingredients -> the final ranked result:
// fully makeable drinks first (alphabetical), then the closest partial matches.
export function rankDrinks(drinks, ingredients, options = config.search) {
    const {maxMissing, maxPartial} = options;

    // Whole-word matching: "gin" owns "Gin" but not "Ginger" or "Sloe gin".
    const userOwns = makeOwnsMatcher(ingredients);

    // Keep only drinks the user genuinely owns an ingredient of; a pantry
    // staple alone (or a LIKE pre-filter false positive) doesn't count.
    const scored = dedupeDrinks(drinks)
        .map((d) => scoreDrink(d, userOwns))
        .filter((d) => d.owned > 0);

    const makeable = scored.filter((d) => d.makeable).sort((a, b) => a.name.localeCompare(b.name));
    const partial = scored
        .filter((d) => !d.makeable && d.missing.length <= maxMissing)
        .sort((a, b) => a.missing.length - b.missing.length || a.name.localeCompare(b.name))
        .slice(0, maxPartial);

    return [...makeable, ...partial];
}

// Returns an error message, or null when the name query is acceptable.
export function validateName(name, limits = config.search) {
    if (!name) return 'Provide a drink name.';
    if (name.length > limits.maxIngredientLength) {
        return `Name is too long (max ${limits.maxIngredientLength} characters).`;
    }
    return null;
}

// Exact name first, then names starting with the text, then the rest; A-Z
// within each group.
export function rankByName(drinks, name, max = config.search.maxPartial) {
    const query = name.toLowerCase();
    const rank = (d) => {
        const n = d.name.toLowerCase();
        return n === query ? 0 : n.startsWith(query) ? 1 : 2;
    };
    return dedupeDrinks(drinks)
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
        .slice(0, max);
}

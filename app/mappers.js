// Mappers: shape a raw database row into what the API returns, so the API
// stays stable even if the database columns change.

export function toDrink(row) {
    return {
        id: row.id,
        name: row.name,
        image_example: row.image_example,
        instructions: row.instructions,
        ingredients: [],
    };
}

export function toIngredient(row) {
    return {
        name: row.ingredient, // the column is called "ingredient", the API says "name"
        quantity: row.quantity,
    };
}

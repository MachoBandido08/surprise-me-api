export default function DrinkModel(data) {
    return {
        id: data.id,
        name: data.name,
        image_example: data.image_example,
        instructions: data.instructions,
        ingredients: []
    }
}
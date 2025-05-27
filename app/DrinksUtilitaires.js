import DrinkModel from "./DrinkModel.js";
import IngredientModel from "./IngredientModel.js";

export function regroupIngredientsToDrinkJSON(data) {
    let dataFinalToSend = []
    let drinkTemp = null, ingredientsTemp = []

    for (const drink_ingredient of data) {
        if (drinkTemp == null) {
            drinkTemp = DrinkModel(drink_ingredient)
        }

        if (drinkTemp.id !== drink_ingredient.id) {
            drinkTemp.ingredients = ingredientsTemp
            dataFinalToSend.push(drinkTemp)
            drinkTemp = DrinkModel(drink_ingredient)
            ingredientsTemp = []
        }

        ingredientsTemp.push(IngredientModel(drink_ingredient))
    }

    drinkTemp.ingredients = ingredientsTemp
    dataFinalToSend.push(drinkTemp)

    return dataFinalToSend
}
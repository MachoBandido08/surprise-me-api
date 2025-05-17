select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where DI2.ingredient not in ('EFFEN Original Vodka','Coffee Liqueur','Maker''s Mark Bourbon','Lime Juice','Fresh Fruit','Espresso','Espresso Beans'));



select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where DI2.ingredient not like '%Vodka%' and DI2.ingredient not like '%Coffee%' and DI2.ingredient not like '%Espresso%');

    // let sqlRequest = "select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where DI2.ingredient not like '%vodka%' and DI2.ingredient not like '%Coffee%' and DI2.ingredient not like '%Espresso%')";

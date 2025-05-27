import sqlite3 from "sqlite3";
import express from "express";
import {regroupIngredientsToDrinkJSON} from "./app/DrinksUtilitaires.js";

// const fetchAll = async (db, sql, params) => {
//     return new Promise((resolve, reject) => {
//         db.all(sql, params, (err, rows) => {
//             if (err) reject(err);
//             resolve(rows);
//         });
//     });
// };

// const express = require('express');
// const sqlite3 = require('sqlite3').verbose();


const app = express();
const port = process.env.PORT || 3000;

const db = new sqlite3.Database('./drinks_database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the drinks database.');
});

app.use(express.json());

// GET all drinks test
app.get('/drinks', (req, res) => {
    db.all('SELECT * FROM Drink', (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Internal server error');
        } else {
            res.send(rows);
        }
    });
});

// GET drinks depending of ingredients
app.get('/drinks/:ingredients', (req, res) => {
    const ingredients = req.params.ingredients.split(",")
    console.log(ingredients)

    // Construct sql request
    // Initial sql request
    let sqlRequest = "select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where DI2.ingredient";

    // Adding ingredients to sql request
    for (let i = 0; i < ingredients.length; i++) {
        if (i === 0) {
            sqlRequest += " not like '%" + ingredients[i] + "%'";
            continue;
        }
        sqlRequest += " and DI2.ingredient not like '%" + ingredients[i] + "%'";
    }

    // close the sql request built
    sqlRequest += ")"

    // make the call
    db.all(sqlRequest, (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Internal server error');
        } else {
            rows = regroupIngredientsToDrinkJSON(rows);
            res.send(rows);
        }
    });
});

app.get('/status', (req, res) => {
    const status = {
        'Status': 'Running'
    };
    res.send(status);

})


// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
});


// (async () => {
//     const db = new sqlite3.Database("drinks_database.db");
//
//     // fetch all drinks
//     let sql = `SELECT * FROM Drink`;
//
//     try {
//         const products = await fetchAll(db, sql);
//         console.log(products);
//     } catch (err) {
//         console.log(err);
//     } finally {
//         db.close();
//     }
// })();
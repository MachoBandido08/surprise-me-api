import sqlite3 from "sqlite3";
import express from "express";
import cors from "cors";
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

app.use(cors());
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
    const ingredients = req.params.ingredients
        .split(",")
        .map(i => i.trim())
        .filter(Boolean)
    console.log(ingredients)

    if (ingredients.length === 0) {
        return res.send([]);
    }

    // Build the request with placeholders so ingredient values can't be
    // injected into the SQL. Order by drink id so rows for the same drink
    // arrive contiguously (regroupIngredientsToDrinkJSON relies on that).
    const conditions = ingredients.map(() => "DI2.ingredient not like ?").join(" and ");
    const sqlRequest =
        "select * from Drink D join Drink_Ingredient DI on D.id = DI.drink_id " +
        "where D.id not in (select DI2.drink_id from Drink_Ingredient DI2 where " +
        conditions + ") order by D.id";
    const params = ingredients.map(ing => "%" + ing + "%");

    // make the call
    db.all(sqlRequest, params, (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Internal server error');
        } else if (rows.length === 0) {
            res.send([]);
        } else {
            const drinks = regroupIngredientsToDrinkJSON(rows);
            // The dataset contains duplicate drinks (same content, different
            // id); collapse them so each cocktail appears once.
            const seen = new Set();
            const unique = drinks.filter(d => {
                const signature = d.name + "|" + d.instructions;
                if (seen.has(signature)) return false;
                seen.add(signature);
                return true;
            });
            res.send(unique);
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
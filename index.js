import sqlite3 from "sqlite3";
import express from "express";

const fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

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

// GET all drinks depending on ingredients available
app.get('/drinks/:ingredients', (req, res) => {
    const ingredients = req.params.ingredients.split(",")
    console.log(ingredients)




    // db.all('SELECT * FROM Drink', (err, rows) => {
    //     if (err) {
    //         console.error(err.message);
    //         res.status(500).send('Internal server error');
    //     } else {
    //         res.send(rows);
    //     }
    // });
});

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
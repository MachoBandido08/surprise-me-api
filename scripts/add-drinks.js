// Adds drinks from a JSON file. Drinks whose name already exists are skipped,
// so it is safe to run more than once.
//
//   node scripts/add-drinks.js scripts/data/classics.json            show what would be added
//   node scripts/add-drinks.js scripts/data/classics.json --apply    write them
//
// File format: [{"name", "instructions", "ingredients": [{"ingredient", "quantity"}]}]
// Quantities should already be in oz (run scripts/convert-units.js if not).
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {APPLY, inTransaction, openDb, printSummary} from "./lib.js";

const file = process.argv.slice(2).find(arg => !arg.startsWith("--"));
if (!file) {
    console.error("Usage: node scripts/add-drinks.js <drinks.json> [--apply]");
    process.exit(1);
}

const drinks = JSON.parse(readFileSync(file, "utf8"));
const db = openDb();

const existing = new Set((await db.all("select lower(name) as name from Drink")).map(r => r.name));
const toAdd = drinks.filter(d => !existing.has(d.name.toLowerCase()));

for (const d of drinks) {
    console.log(`${existing.has(d.name.toLowerCase()) ? "skip (exists)" : "add          "}  ${d.name}`);
}

if (APPLY && toAdd.length > 0) {
    await inTransaction(db, async () => {
        for (const d of toAdd) {
            const id = randomUUID();
            await db.run(
                "insert into Drink (id, name, image_example, instructions) values (?, ?, ?, ?)",
                [id, d.name, d.image_example ?? "", d.instructions]
            );
            for (const i of d.ingredients) {
                await db.run(
                    "insert into Drink_Ingredient (drink_id, ingredient, quantity) values (?, ?, ?)",
                    [id, i.ingredient, i.quantity]
                );
            }
        }
    });
}

printSummary(toAdd.length, "drinks");
await db.close();

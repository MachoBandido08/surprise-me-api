// Converts ingredient quantities written in cl or ml to oz, rounded to the
// nearest 1/4 oz (whole ounces for large amounts). Safe to run more than once.
//
//   node scripts/convert-units.js            show what would change
//   node scripts/convert-units.js --apply    write the changes
//
// Quantities it can't parse (e.g. "1 750 ml Bottle of") are listed so you can
// fix them by hand.
import {APPLY, inTransaction, openDb, printSummary} from './lib.js';

const ML_PER_OZ = 29.5735;
const FRACTIONS = {0.25: '1/4', 0.5: '1/2', 0.75: '3/4'};

// "1 1/2" -> 1.5, "3/4" -> 0.75, "2.5" -> 2.5
const toNumber = (text) => {
    const mixed = text.trim().match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return +mixed[1] + mixed[2] / mixed[3];
    const fraction = text.trim().match(/^(\d+)\/(\d+)$/);
    if (fraction) return fraction[1] / fraction[2];
    return parseFloat(text);
};

const formatOz = (oz) => {
    if (oz >= 8) return String(Math.round(oz));
    if (oz < 0.2) return '1/8';
    const quarters = Math.round(oz * 4) / 4;
    const whole = Math.floor(quarters);
    const fraction = quarters - whole;
    return (
        (whole ? String(whole) : '') + (fraction ? (whole ? ' ' : '') + FRACTIONS[fraction] : '') ||
        '1/4'
    );
};

// optional "Add ", a number / mixed fraction / range, cl or ml, then any trailing text
const QUANTITY = /^(add\s+)?(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?(?:-\d+(?:\.\d+)?)?)\s*(cl|ml)\b(.*)$/i;

function convertQuantity(quantity) {
    const match = quantity.match(QUANTITY);
    if (!match) return null;
    const [, add, amount, unit, rest] = match;
    const mlPerUnit = unit.toLowerCase() === 'cl' ? 10 : 1;
    const oz = amount.split('-').map((part) => formatOz((toNumber(part) * mlPerUnit) / ML_PER_OZ));
    return (add ? 'Add ' : '') + oz.join('-') + ' oz' + rest;
}

const db = openDb();

const rows = await db.all(
    'select rowid as id, ingredient, quantity from Drink_Ingredient ' +
        "where lower(quantity) glob '*[0-9 ]cl*' or lower(quantity) glob '*[0-9 ]ml*'",
);

const changes = [];
for (const row of rows) {
    const converted = convertQuantity(row.quantity);
    if (converted === null) {
        console.log(`SKIPPED (fix by hand): ${JSON.stringify(row.quantity)} ${row.ingredient}`);
    } else {
        console.log(`${row.quantity} -> ${converted}  (${row.ingredient})`);
        changes.push({id: row.id, converted});
    }
}

if (APPLY && changes.length > 0) {
    await inTransaction(db, async () => {
        for (const c of changes) {
            await db.run('update Drink_Ingredient set quantity = ? where rowid = ?', [
                c.converted,
                c.id,
            ]);
        }
    });
}

printSummary(changes.length, 'quantities');
await db.close();

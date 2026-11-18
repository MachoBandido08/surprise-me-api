// Strips HTML tags and entities (<br/>, <sup></sup>, &nbsp;) from drink names
// and instructions. Safe to run more than once.
//
//   node scripts/clean-html.js            show what would change
//   node scripts/clean-html.js --apply    write the changes
import {APPLY, inTransaction, openDb, printSummary} from './lib.js';

const clean = (text) =>
    (text ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

const db = openDb();

const rows = await db.all(
    'select id, name, instructions from Drink ' +
        "where name like '%<%' or instructions like '%<%' " +
        "or name like '%&%;%' or instructions like '%&%;%'",
);

const changes = rows
    .map((row) => ({
        id: row.id,
        before: row,
        name: clean(row.name),
        instructions: clean(row.instructions),
    }))
    .filter((c) => c.name !== c.before.name || c.instructions !== c.before.instructions);

for (const c of changes) {
    if (c.name !== c.before.name)
        console.log(`name: ${JSON.stringify(c.before.name)} -> ${JSON.stringify(c.name)}`);
    else console.log(`instructions: ${c.name}`);
}

if (APPLY && changes.length > 0) {
    await inTransaction(db, async () => {
        for (const c of changes) {
            await db.run('update Drink set name = ?, instructions = ? where id = ?', [
                c.name,
                c.instructions,
                c.id,
            ]);
        }
    });
}

printSummary(changes.length, 'drinks');
await db.close();

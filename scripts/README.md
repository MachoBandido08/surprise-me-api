# Data scripts

The drink data lives in `drinks_database.db`, a binary file, so changes to it are
made with these scripts. That keeps a readable record of how the data was fixed
and lets you repeat the fix when new data comes in.

Every script **only shows what it would change** unless you add `--apply`. Each
one is safe to run twice, and runs its changes in one transaction.

Stop the local backend (`npm run dev`) before using `--apply`: on Windows, git
can't replace the database file while the server has it open.

| Script | What it does |
| --- | --- |
| `node scripts/clean-html.js` | Strips HTML tags and entities (`<br/>`, `<sup></sup>`, `&nbsp;`) from drink names and instructions |
| `node scripts/convert-units.js` | Converts `cl` and `ml` quantities to `oz`. Lists any it can't parse so you can fix them by hand |
| `node scripts/add-drinks.js <file.json>` | Adds drinks from a JSON file, skipping names that already exist |

`scripts/data/classics.json` is the format example for `add-drinks.js`:

```json
[{"name": "Gibson", "instructions": "...", "ingredients": [{"ingredient": "Gin", "quantity": "2 1/2 oz"}]}]
```

## Adding new data

1. `node scripts/add-drinks.js my-drinks.json` to preview, then add `--apply`.
2. `node scripts/clean-html.js --apply` and `node scripts/convert-units.js --apply`.
3. `npm test`. The data-quality tests fail if HTML, cl/ml or orphaned rows remain.
4. Commit the database together with the script or JSON file that produced the change.

# Surprise Me API 🍸

The backend for [**Surprise Me**](https://github.com/MachoBandido08/surprise-me) — a cocktail finder. Given a list of ingredients a user has, it returns cocktails they can make, **fully-makeable ones first**, then close partial matches annotated with what's missing.

Built with **Express** and a read-only **SQLite** database that ships with the app.

## API

Base URL (production): `https://surprise-me-backend.onrender.com`

### `GET /drinks/:ingredients`
The main endpoint. `:ingredients` is a comma-separated, URL-encoded list.

```
GET /drinks/tequila,triple%20sec
```

Returns an array of drinks, **fully makeable first** (alphabetical), then the closest partial matches (missing at most 2 ingredients). Each drink is annotated:

```jsonc
[
  {
    "id": "325f8efb-…",
    "name": "Margarita",
    "image_example": "https://…",
    "instructions": "Rub the rim of the glass with the lime slice…",
    "ingredients": [
      { "name": "Tequila", "quantity": "1 1/2 oz" },
      { "name": "Triple sec", "quantity": "1/2 oz" }
    ],
    "owned": 2,          // ingredients the user listed
    "missing": [],       // real ingredients still needed (pantry staples excluded)
    "makeable": true     // true when nothing is missing
  }
]
```

How matching works:
- **Whole-word matching** — `gin` matches `Gin` but not `oriGINal` or `GINger`.
- **Pantry staples are assumed** — `salt`, `ice`, `water`, `sugar`, `pepper`, `lime`, `egg` (and forms like `Lime Juice`, `Sea Salt`, `Egg White`) never count as missing.
- A drink only appears if the user owns at least one *real* (non-pantry) ingredient of it.
- Duplicate drinks (same name + instructions) are collapsed.

**Validation** (returns `400` with `{ "error": "…" }`): at least one ingredient, at most 20, each ≤ 60 characters.

### `GET /status`
Health check → `{ "Status": "Running" }`.

### `GET /drinks`
Returns all drink rows (raw). A simple debug endpoint.

### Notes
- **CORS** is open (`*`) — it's a public, read-only API.
- **Rate limited** to 60 requests/minute per IP on `/drinks` (429 with a JSON error). `/status` is unlimited for health checks.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+.

```bash
# Install dependencies
npm install

# Run in dev with auto-reload (nodemon)
npm run dev

# Or run once
npm start
```

The server listens on `PORT` (default `3000`).

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on save) |
| `npm start` | Start with `node index.js` |

## Data

A **SQLite** file (`drinks_database.db`) committed to the repo, with two tables:
- **`Drink`** — `id`, `name`, `image_example`, `instructions`
- **`Drink_Ingredient`** — `drink_id`, `ingredient`, `quantity`

The dataset is supplemented with cocktails from [TheCocktailDB](https://www.thecocktaildb.com/). Because it's **read-only**, the database ships inside each deploy — no external database or migrations needed.

## Project structure

```
index.js              # Wiring: middleware, routes, error handling, server lifecycle
app/
├── config.js         # Tunables (port, rate limit, search caps, input limits)
├── db.js             # SQLite connection + dbAll() + closeDb()
├── routes.js         # Express router: /status, /drinks, /drinks/:ingredients
├── pantry.js         # isPantry() — assumed staple detection
├── DrinksUtilitaires.js  # Groups joined rows into drink objects
├── DrinkModel.js
└── IngredientModel.js
drinks_database.db    # The SQLite dataset
```

## Deployment

Auto-deploys to **Render** from the `main` branch (build `npm install`, start `node index.js`).

> ⚠️ **Keep `sqlite3` on v5.** Upgrading to sqlite3 v6 crashes on Render's runtime (`ERR_DLOPEN_FAILED` — its native binary needs a newer glibc than Render provides).

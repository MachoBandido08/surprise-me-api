import {after, before, test} from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import {closeDb, dbAll} from "../app/db.js";
import {config} from "../app/config.js";

// Runs the real app against the committed (read-only) database.
let server, base;

before(async () => {
    await new Promise(resolve => {
        server = app.listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}`;
});

after(async () => {
    await new Promise(resolve => server.close(resolve));
    await closeDb();
});

const search = async (ingredients) => {
    const res = await fetch(`${base}/drinks/${encodeURIComponent(ingredients)}`);
    return {status: res.status, body: await res.json()};
};

test("GET /status", async () => {
    const res = await fetch(`${base}/status`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {Status: "Running"});
});

test("search: rejects an empty ingredient list", async () => {
    const {status, body} = await search(" , ,");
    assert.equal(status, 400);
    assert.match(body.error, /at least one/i);
});

test("search: rejects too many ingredients", async () => {
    const tooMany = Array.from({length: config.search.maxIngredients + 1}, (_, i) => `x${i}`).join(",");
    const {status} = await search(tooMany);
    assert.equal(status, 400);
});

test("search: rejects overly long ingredient names", async () => {
    const {status} = await search("a".repeat(config.search.maxIngredientLength + 1));
    assert.equal(status, 400);
});

test("search: unknown ingredient returns an empty list", async () => {
    const {status, body} = await search("zzzqqq-not-an-ingredient");
    assert.equal(status, 200);
    assert.deepEqual(body, []);
});

test("search: every result uses the user's ingredient and is annotated", async () => {
    const {status, body} = await search("gin");
    assert.equal(status, 200);
    assert.ok(body.length > 0);
    for (const drink of body) {
        assert.ok(drink.owned > 0, drink.name);
        assert.equal(drink.makeable, drink.missing.length === 0, drink.name);
        assert.ok(drink.makeable || drink.missing.length <= config.search.maxMissing, drink.name);
    }
});

test("search: makeable drinks come before partial ones", async () => {
    const {body} = await search("gin");
    const firstPartial = body.findIndex(d => !d.makeable);
    if (firstPartial !== -1) {
        assert.ok(body.slice(firstPartial).every(d => !d.makeable));
    }
    assert.ok(body.filter(d => !d.makeable).length <= config.search.maxPartial);
});

test("search: whole-word matching ('gin' does not match 'ginger')", async () => {
    const {body} = await search("gin");
    for (const drink of body) {
        assert.ok(
            drink.ingredients.some(i => /\bgin\b/i.test(i.name)),
            `${drink.name} has no whole-word gin`
        );
    }
});

test("search: results contain no duplicate drinks", async () => {
    const {body} = await search("rum,lime juice");
    const keys = body.map(d => d.name + "|" + d.instructions);
    assert.equal(new Set(keys).size, keys.length);
});

test("search: a garnish never counts as missing", async () => {
    const {body} = await search("gin,dry vermouth");
    assert.ok(body.length > 0);
    for (const drink of body) {
        assert.ok(
            !drink.missing.some(m => /^(olives?|maraschino cherr(y|ies))$/i.test(m)),
            drink.name
        );
    }
});

test("search: user ingredients are matched case-insensitively", async () => {
    const lower = await search("rum");
    const upper = await search("RUM");
    assert.deepEqual(upper.body.map(d => d.name), lower.body.map(d => d.name));
});

test("search: a SQL-injection-looking ingredient is treated as plain text", async () => {
    const {status, body} = await search("'; drop table Drink; --");
    assert.equal(status, 200);
    assert.deepEqual(body, []);
    const [{n}] = await dbAll("select count(*) n from Drink");
    assert.ok(n > 0);
});

// Data-quality guards: these catch the kinds of problems fixed by hand before.
test("data: no HTML tags or entities in drink names or instructions", async () => {
    const rows = await dbAll(
        "select name from Drink where name like '%<%' or instructions like '%<%' " +
        "or name like '%&nbsp;%' or instructions like '%&nbsp;%'"
    );
    assert.deepEqual(rows, []);
});

test("data: quantities use oz, not cl or ml", async () => {
    const rows = await dbAll(
        "select quantity from Drink_Ingredient " +
        "where lower(quantity) glob '*[0-9 ]cl*' or lower(quantity) glob '*[0-9 ]ml*'"
    );
    assert.deepEqual(rows, []);
});

test("data: every ingredient row points at an existing drink", async () => {
    const rows = await dbAll(
        "select distinct drink_id from Drink_Ingredient where drink_id not in (select id from Drink)"
    );
    assert.deepEqual(rows, []);
});

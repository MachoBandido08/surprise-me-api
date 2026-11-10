import {after, before, test} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import routes from "../app/routes.js";
import {closeDb} from "../app/db.js";

// Kept in its own file: it closes the shared database connection, which would
// break the other API tests (node --test runs each file in its own process).
let server, base;

before(async () => {
    const app = express();
    app.use(routes);
    // Same shape as the central error handler in index.js (without the logging).
    app.use((err, req, res, next) => {
        res.status(500).send({error: 'Internal server error'});
    });
    await new Promise(resolve => {
        server = app.listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}`;
});

after(async () => {
    await new Promise(resolve => server.close(resolve));
});

test("a database failure returns a 500 and the server keeps running", async () => {
    await closeDb(); // later queries fail with SQLITE_MISUSE

    for (const path of ["/drinks", "/drinks/gin"]) {
        const res = await fetch(base + path);
        assert.equal(res.status, 500, path);
        assert.deepEqual(await res.json(), {error: "Internal server error"});
    }

    // The process survived: routes that don't touch the database still work.
    const status = await fetch(`${base}/status`);
    assert.equal(status.status, 200);
});

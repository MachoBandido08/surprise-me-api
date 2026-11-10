import app from "./app.js";
import {closeDb} from "./app/db.js";
import {config} from "./app/config.js";

// --- Start + graceful shutdown ----------------------------------------------

const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}.`);
});

const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
        await closeDb();
        process.exit(0);
    });
    // Force exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

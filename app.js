import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "./app/routes.js";
import {config} from "./app/config.js";

// Builds the Express app without starting it, so tests can use the real thing.
const app = express();

// Render serves the app behind one proxy; trust it so req.ip is the real
// client IP (needed to rate limit per user rather than per proxy).
app.set('trust proxy', 1);

// --- Middleware -------------------------------------------------------------

app.use(cors());
app.use(express.json());

// Log each request once it finishes: method, path, status, duration.
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

// Rate limit the search endpoints so a single client can't hammer the API.
// /status is left unlimited for health checks.
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {error: 'Too many requests — please wait a moment and try again.'},
});
app.use('/drinks', limiter);

// --- Routes -----------------------------------------------------------------

app.use('/', routes);

// --- 404 + error handling ---------------------------------------------------

app.use((req, res) => {
    res.status(404).send({error: 'Not found'});
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack || err.message);
    res.status(500).send({error: 'Internal server error'});
});

export default app;

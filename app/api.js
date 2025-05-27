import express from "express";
import defineRoutes from "./routes.js";

const api = express();
api.use(express.json());

defineRoutes(api)
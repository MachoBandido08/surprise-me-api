// Central place for the app's tunable values.
export const config = {
    port: process.env.PORT || 3000,

    // Rate limiting for the search endpoints.
    rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        limit: 60,           // requests per window per IP
    },

    // Search behaviour and input validation.
    search: {
        maxMissing: 2,        // how incomplete a "partial" drink may be
        maxPartial: 30,       // cap on partial matches returned
        maxIngredients: 20,   // max ingredients accepted per request
        maxIngredientLength: 60,
    },
};

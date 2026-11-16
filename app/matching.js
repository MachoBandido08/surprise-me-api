// Decides whether an ingredient the user typed satisfies a drink's ingredient.
// Matching is by whole word, with two refinements:
//   1. Look-alikes: "gin" must not satisfy "Sloe gin", which is a different
//      bottle even though it contains the word.
//   2. Generic recipe lines: a recipe asking for plain "Vermouth" is satisfied
//      by "dry vermouth" or "sweet vermouth".

// Ingredients that contain another ingredient's name but are not that thing.
const LOOK_ALIKES = ['sloe gin', 'cherry brandy', 'ginger beer', 'root beer', 'ginger wine'];

// Plain recipe words that any more specific kind of the same thing satisfies.
const GENERIC = new Set(['vermouth', 'rum', 'brandy', 'whiskey', 'whisky', 'tequila', 'vodka', 'gin', 'wine']);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Returns userOwns(recipeIngredientName) for the user's (lowercased) terms.
export function makeOwnsMatcher(terms) {
    const matchers = terms.map(term => ({
        term,
        wholeWord: new RegExp('\\b' + escapeRegex(term) + '\\b', 'i'),
        // Look-alikes to hide from this term, unless the user typed that very thing.
        hidden: LOOK_ALIKES.filter(phrase => !term.includes(phrase)),
        // "dry vermouth" can stand in for a recipe's plain "vermouth".
        generic: LOOK_ALIKES.some(phrase => term.includes(phrase))
            ? null
            : term.split(' ').pop(),
    }));

    return (name) => {
        const lower = (name || '').toLowerCase().trim();
        return matchers.some(({term, wholeWord, hidden, generic}) => {
            let visible = lower;
            for (const phrase of hidden) visible = visible.replace(phrase, ' ');
            if (wholeWord.test(visible)) return true;
            return generic !== null && generic !== term && lower === generic && GENERIC.has(generic);
        });
    };
}

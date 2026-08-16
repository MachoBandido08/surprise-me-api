// "Pantry" staples assumed to be in every kitchen: they never count as
// "missing" when deciding if a drink is makeable. An ingredient qualifies only
// if it's essentially just a staple — a core word plus harmless descriptors —
// so "Lime Juice", "Sea Salt" and "Egg White" pass, but "Tonic Water", "Ice
// Cream", "Lime Vodka" and "Dr. Pepper" do not. (A pantry staple alone does
// NOT make a drink relevant — the user must still own a real ingredient.)
const PANTRY_CORE = new Set(['salt', 'ice', 'water', 'sugar', 'pepper', 'lime', 'limes', 'egg', 'eggs']);
const PANTRY_DESCRIPTORS = new Set([
    'sea', 'black', 'white', 'whites', 'kosher', 'table', 'brown', 'powdered',
    'granulated', 'caster', 'demerara', 'superfine', 'raw', 'crushed', 'cube',
    'cubes', 'cubed', 'block', 'blocks', 'shaved', 'fresh', 'freshly', 'squeezed',
    'hot', 'cold', 'warm', 'chilled', 'still', 'juice', 'wedge', 'wedges', 'wheel',
    'wheels', 'twist', 'peel', 'zest', 'slice', 'sliced', 'half', 'halves',
    'quarter', 'quartered', 'whole', 'yolk', 'yolks', 'a', 'an', 'of', 'the',
    'or', 'and', 'for', 'to', 'with', 'on', 'rim', 'optional',
]);

export function isPantry(name) {
    const tokens = (name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    let hasCore = false;
    for (const t of tokens) {
        if (PANTRY_CORE.has(t)) hasCore = true;
        else if (!PANTRY_DESCRIPTORS.has(t) && !/^\d+$/.test(t)) return false; // foreign word
    }
    return hasCore;
}

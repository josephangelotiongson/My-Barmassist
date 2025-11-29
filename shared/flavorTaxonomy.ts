export interface FlavorNote {
  id: string;
  label: string;
}

export interface FlavorCategory {
  id: string;
  label: string;
  color: string;
  notes: FlavorNote[];
}

export const FLAVOR_TAXONOMY: FlavorCategory[] = [
  {
    id: 'sweet',
    label: 'Sweet',
    color: '#f59e0b',
    notes: [
      { id: 'sweet.honey', label: 'Honey' },
      { id: 'sweet.caramel', label: 'Caramel' },
      { id: 'sweet.vanilla', label: 'Vanilla' },
      { id: 'sweet.maple', label: 'Maple' },
    ]
  },
  {
    id: 'sour',
    label: 'Sour',
    color: '#84cc16',
    notes: [
      { id: 'sour.citrus', label: 'Citrus' },
      { id: 'sour.tart', label: 'Tart' },
      { id: 'sour.vinegar', label: 'Vinegar' },
      { id: 'sour.fermented', label: 'Fermented' },
    ]
  },
  {
    id: 'bitter',
    label: 'Bitter',
    color: '#14b8a6',
    notes: [
      { id: 'bitter.coffee', label: 'Coffee' },
      { id: 'bitter.chocolate', label: 'Chocolate' },
      { id: 'bitter.herbal', label: 'Amaro' },
      { id: 'bitter.citrus', label: 'Citrus Peel' },
    ]
  },
  {
    id: 'boozy',
    label: 'Boozy',
    color: '#a78bfa',
    notes: [
      { id: 'boozy.whiskey', label: 'Whiskey' },
      { id: 'boozy.rum', label: 'Rum' },
      { id: 'boozy.brandy', label: 'Brandy' },
      { id: 'boozy.gin', label: 'Gin' },
    ]
  },
  {
    id: 'herbal',
    label: 'Herbal',
    color: '#22c55e',
    notes: [
      { id: 'herbal.mint', label: 'Mint' },
      { id: 'herbal.basil', label: 'Basil' },
      { id: 'herbal.rosemary', label: 'Rosemary' },
      { id: 'herbal.thyme', label: 'Thyme' },
    ]
  },
  {
    id: 'fruity',
    label: 'Fruity',
    color: '#ec4899',
    notes: [
      { id: 'fruity.berry', label: 'Berry' },
      { id: 'fruity.tropical', label: 'Tropical' },
      { id: 'fruity.stone', label: 'Stone Fruit' },
      { id: 'fruity.apple', label: 'Apple/Pear' },
    ]
  },
  {
    id: 'spicy',
    label: 'Spicy',
    color: '#f97316',
    notes: [
      { id: 'spicy.pepper', label: 'Pepper' },
      { id: 'spicy.cinnamon', label: 'Cinnamon' },
      { id: 'spicy.ginger', label: 'Ginger' },
      { id: 'spicy.clove', label: 'Clove' },
    ]
  },
  {
    id: 'smoky',
    label: 'Smoky',
    color: '#78716c',
    notes: [
      { id: 'smoky.peat', label: 'Peat' },
      { id: 'smoky.charred', label: 'Charred' },
      { id: 'smoky.tobacco', label: 'Tobacco' },
      { id: 'smoky.leather', label: 'Leather' },
    ]
  },
];

export interface FlavorSelection {
  categories: Set<string>;
  notes: Set<string>;
}

export function createEmptySelection(): FlavorSelection {
  return {
    categories: new Set(),
    notes: new Set(),
  };
}

export function getSelectedLabels(selection: FlavorSelection): string[] {
  const labels: string[] = [];
  
  FLAVOR_TAXONOMY.forEach(cat => {
    const selectedNotes = cat.notes.filter(n => selection.notes.has(n.id));
    if (selectedNotes.length > 0) {
      selectedNotes.forEach(n => labels.push(n.label));
    } else if (selection.categories.has(cat.id)) {
      labels.push(cat.label);
    }
  });
  
  return labels;
}

export function selectionToFlavorProfile(
  selection: FlavorSelection, 
  baseProfile?: Record<string, number>
): Record<string, number> {
  const defaultBase: Record<string, number> = {
    Sweet: 0, Sour: 0, Bitter: 0, Boozy: 0,
    Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0
  };
  const base = baseProfile || defaultBase;
  
  const profile: Record<string, number> = { ...base };
  
  FLAVOR_TAXONOMY.forEach(cat => {
    const categorySelected = selection.categories.has(cat.id);
    const selectedNotes = cat.notes.filter(n => selection.notes.has(n.id));
    
    if (selectedNotes.length > 0) {
      profile[cat.label] = Math.min(10, 5 + selectedNotes.length * 2);
    } else if (categorySelected) {
      profile[cat.label] = 5;
    }
  });
  
  return profile;
}

const INGREDIENT_FLAVOR_MAP: Record<string, string[]> = {
  'bourbon': ['boozy.whiskey', 'sweet.caramel', 'sweet.vanilla', 'smoky.charred'],
  'rye': ['boozy.whiskey', 'spicy.pepper', 'smoky.charred'],
  'rye whiskey': ['boozy.whiskey', 'spicy.pepper', 'smoky.charred'],
  'whiskey': ['boozy.whiskey', 'smoky.charred'],
  'scotch': ['boozy.whiskey', 'smoky.peat'],
  'islay scotch': ['boozy.whiskey', 'smoky.peat', 'smoky.charred'],
  'irish whiskey': ['boozy.whiskey', 'sweet.honey'],
  'japanese whisky': ['boozy.whiskey', 'sweet.honey', 'fruity.apple'],
  
  'rum': ['boozy.rum', 'sweet.caramel'],
  'white rum': ['boozy.rum'],
  'dark rum': ['boozy.rum', 'sweet.caramel', 'sweet.molasses', 'smoky.charred'],
  'aged rum': ['boozy.rum', 'sweet.caramel', 'sweet.vanilla'],
  'spiced rum': ['boozy.rum', 'spicy.cinnamon', 'spicy.clove', 'sweet.vanilla'],
  'overproof rum': ['boozy.rum'],
  'jamaican rum': ['boozy.rum', 'fruity.tropical'],
  'demerara rum': ['boozy.rum', 'sweet.caramel'],
  'rhum agricole': ['boozy.rum', 'herbal.basil', 'fruity.tropical'],
  
  'gin': ['boozy.gin', 'herbal.rosemary', 'sour.citrus'],
  'london dry gin': ['boozy.gin', 'herbal.rosemary'],
  'old tom gin': ['boozy.gin', 'sweet.honey'],
  'sloe gin': ['boozy.gin', 'fruity.berry'],
  'navy strength gin': ['boozy.gin', 'herbal.rosemary'],
  
  'vodka': ['boozy.whiskey'],
  
  'tequila': ['boozy.brandy', 'herbal.basil', 'spicy.pepper'],
  'blanco tequila': ['boozy.brandy', 'spicy.pepper', 'sour.citrus'],
  'reposado tequila': ['boozy.brandy', 'sweet.vanilla', 'spicy.pepper'],
  'anejo tequila': ['boozy.brandy', 'sweet.caramel', 'sweet.vanilla'],
  'mezcal': ['smoky.peat', 'smoky.charred', 'boozy.brandy', 'fruity.tropical'],
  
  'brandy': ['boozy.brandy', 'fruity.stone', 'sweet.caramel'],
  'cognac': ['boozy.brandy', 'fruity.stone', 'sweet.vanilla', 'sweet.caramel'],
  'armagnac': ['boozy.brandy', 'fruity.stone', 'sweet.caramel'],
  'calvados': ['boozy.brandy', 'fruity.apple'],
  'pisco': ['boozy.brandy', 'fruity.tropical'],
  'applejack': ['boozy.brandy', 'fruity.apple', 'sweet.caramel'],
  
  'vermouth': ['herbal.thyme', 'bitter.herbal'],
  'sweet vermouth': ['sweet.caramel', 'herbal.thyme', 'bitter.herbal', 'spicy.clove'],
  'dry vermouth': ['herbal.thyme', 'sour.citrus'],
  'blanc vermouth': ['herbal.thyme', 'sweet.honey'],
  
  'campari': ['bitter.herbal', 'bitter.citrus', 'sweet.caramel'],
  'aperol': ['bitter.citrus', 'sweet.honey', 'fruity.stone'],
  'cynar': ['bitter.herbal', 'herbal.thyme'],
  'fernet': ['bitter.herbal', 'herbal.mint', 'spicy.pepper'],
  'fernet branca': ['bitter.herbal', 'herbal.mint', 'spicy.pepper'],
  'amaro': ['bitter.herbal', 'sweet.caramel', 'herbal.thyme'],
  'averna': ['bitter.herbal', 'sweet.caramel'],
  'montenegro': ['bitter.herbal', 'sweet.honey'],
  
  'bitters': ['bitter.herbal', 'spicy.clove'],
  'angostura': ['bitter.herbal', 'spicy.clove', 'spicy.cinnamon'],
  'angostura bitters': ['bitter.herbal', 'spicy.clove', 'spicy.cinnamon'],
  'peychaud': ['bitter.herbal', 'herbal.basil', 'sweet.honey'],
  "peychaud's": ['bitter.herbal', 'herbal.basil', 'sweet.honey'],
  "peychaud's bitters": ['bitter.herbal', 'herbal.basil', 'sweet.honey'],
  'orange bitters': ['bitter.citrus', 'sour.citrus'],
  'chocolate bitters': ['bitter.chocolate', 'sweet.vanilla'],
  'mole bitters': ['bitter.chocolate', 'spicy.pepper'],
  'coffee bitters': ['bitter.coffee', 'smoky.charred'],
  
  'absinthe': ['herbal.basil', 'herbal.thyme', 'bitter.herbal'],
  'pastis': ['herbal.basil', 'sweet.honey'],
  'pernod': ['herbal.basil', 'sweet.honey'],
  'herbsaint': ['herbal.basil', 'herbal.thyme'],
  
  'chartreuse': ['herbal.thyme', 'herbal.basil', 'sweet.honey'],
  'green chartreuse': ['herbal.thyme', 'herbal.basil', 'bitter.herbal'],
  'yellow chartreuse': ['herbal.thyme', 'sweet.honey'],
  'benedictine': ['herbal.thyme', 'sweet.honey', 'spicy.clove'],
  'drambuie': ['sweet.honey', 'herbal.thyme', 'boozy.whiskey'],
  'st germain': ['herbal.basil', 'sweet.honey', 'fruity.tropical'],
  'elderflower': ['herbal.basil', 'sweet.honey', 'fruity.tropical'],
  
  'triple sec': ['sour.citrus', 'sweet.honey'],
  'cointreau': ['sour.citrus', 'sweet.honey'],
  'curacao': ['sour.citrus', 'sweet.caramel'],
  'grand marnier': ['sour.citrus', 'boozy.brandy', 'sweet.caramel'],
  'limoncello': ['sour.citrus', 'sweet.honey'],
  
  'maraschino': ['fruity.stone', 'sweet.honey', 'bitter.herbal'],
  'luxardo': ['fruity.stone', 'sweet.honey'],
  'kirsch': ['fruity.stone', 'boozy.brandy'],
  'creme de cassis': ['fruity.berry', 'sweet.caramel'],
  'chambord': ['fruity.berry', 'sweet.honey'],
  'creme de mure': ['fruity.berry', 'sweet.caramel'],
  
  'kahlua': ['bitter.coffee', 'sweet.vanilla', 'sweet.caramel'],
  'coffee liqueur': ['bitter.coffee', 'sweet.vanilla'],
  'creme de cacao': ['bitter.chocolate', 'sweet.vanilla'],
  'amaretto': ['sweet.honey', 'bitter.herbal', 'fruity.stone'],
  'frangelico': ['sweet.honey', 'sweet.vanilla'],
  
  'falernum': ['spicy.clove', 'spicy.ginger', 'sweet.honey', 'sour.citrus'],
  'allspice dram': ['spicy.clove', 'spicy.cinnamon', 'sweet.caramel'],
  'velvet falernum': ['spicy.clove', 'spicy.ginger', 'sweet.honey'],
  
  'grenadine': ['fruity.berry', 'sweet.caramel'],
  'orgeat': ['sweet.honey', 'sweet.vanilla'],
  'simple syrup': ['sweet.honey'],
  'demerara syrup': ['sweet.caramel', 'sweet.honey'],
  'honey syrup': ['sweet.honey'],
  'honey': ['sweet.honey'],
  'maple syrup': ['sweet.maple', 'sweet.caramel'],
  'agave': ['sweet.honey'],
  'agave syrup': ['sweet.honey'],
  'agave nectar': ['sweet.honey'],
  'cinnamon syrup': ['spicy.cinnamon', 'sweet.honey'],
  'ginger syrup': ['spicy.ginger', 'sweet.honey'],
  
  'lemon': ['sour.citrus', 'sour.tart'],
  'lemon juice': ['sour.citrus', 'sour.tart'],
  'lime': ['sour.citrus', 'sour.tart'],
  'lime juice': ['sour.citrus', 'sour.tart'],
  'orange': ['sour.citrus', 'sweet.honey', 'fruity.tropical'],
  'orange juice': ['sour.citrus', 'sweet.honey'],
  'grapefruit': ['sour.citrus', 'bitter.citrus', 'sour.tart'],
  'grapefruit juice': ['sour.citrus', 'bitter.citrus'],
  
  'pineapple': ['fruity.tropical', 'sour.tart'],
  'pineapple juice': ['fruity.tropical', 'sour.tart'],
  'passion fruit': ['fruity.tropical', 'sour.tart'],
  'mango': ['fruity.tropical', 'sweet.honey'],
  'coconut': ['fruity.tropical', 'sweet.vanilla'],
  'coconut cream': ['fruity.tropical', 'sweet.vanilla'],
  'banana': ['fruity.tropical', 'sweet.honey'],
  
  'strawberry': ['fruity.berry', 'sweet.honey'],
  'raspberry': ['fruity.berry', 'sour.tart'],
  'blackberry': ['fruity.berry', 'sour.tart'],
  'cranberry': ['fruity.berry', 'sour.tart', 'bitter.herbal'],
  'cherry': ['fruity.stone', 'sweet.honey'],
  'peach': ['fruity.stone', 'sweet.honey'],
  'apricot': ['fruity.stone', 'sweet.honey'],
  'apple': ['fruity.apple', 'sour.tart'],
  'pear': ['fruity.apple', 'sweet.honey'],
  
  'mint': ['herbal.mint'],
  'fresh mint': ['herbal.mint'],
  'mint leaves': ['herbal.mint'],
  'basil': ['herbal.basil'],
  'fresh basil': ['herbal.basil'],
  'rosemary': ['herbal.rosemary'],
  'thyme': ['herbal.thyme'],
  'sage': ['herbal.rosemary'],
  'lavender': ['herbal.thyme', 'sweet.honey'],
  'cucumber': ['herbal.basil', 'sour.tart'],
  
  'ginger': ['spicy.ginger'],
  'ginger beer': ['spicy.ginger', 'sweet.honey'],
  'pepper': ['spicy.pepper'],
  'black pepper': ['spicy.pepper'],
  'chili': ['spicy.pepper'],
  'jalapeno': ['spicy.pepper'],
  'cayenne': ['spicy.pepper'],
  'cinnamon': ['spicy.cinnamon', 'sweet.honey'],
  'clove': ['spicy.clove'],
  'nutmeg': ['spicy.clove', 'sweet.honey'],
  'allspice': ['spicy.clove', 'spicy.cinnamon'],
  'cardamom': ['spicy.clove', 'herbal.thyme'],
  'star anise': ['herbal.basil', 'sweet.honey'],
  
  'coffee': ['bitter.coffee'],
  'espresso': ['bitter.coffee', 'bitter.chocolate'],
  'cold brew': ['bitter.coffee'],
  'chocolate': ['bitter.chocolate', 'sweet.vanilla'],
  'cocoa': ['bitter.chocolate'],
  'cacao': ['bitter.chocolate'],
  
  'smoke': ['smoky.charred'],
  'smoked': ['smoky.charred'],
  'tobacco': ['smoky.tobacco'],
  'leather': ['smoky.leather'],
  
  'egg white': ['sweet.vanilla'],
  'aquafaba': ['sweet.vanilla'],
  'cream': ['sweet.vanilla', 'sweet.caramel'],
  'heavy cream': ['sweet.vanilla'],
  
  'prosecco': ['fruity.apple', 'sour.tart'],
  'champagne': ['fruity.apple', 'sour.tart'],
  'sparkling wine': ['fruity.apple', 'sour.tart'],
  'soda': [],
  'club soda': [],
  'tonic': ['bitter.herbal', 'sour.tart'],
  'tonic water': ['bitter.herbal', 'sour.tart'],
  'cola': ['sweet.caramel', 'spicy.cinnamon'],
  
  'sherry': ['sweet.caramel', 'fruity.stone'],
  'fino sherry': ['sour.fermented', 'bitter.herbal'],
  'oloroso sherry': ['sweet.caramel', 'fruity.stone'],
  'pedro ximenez': ['sweet.caramel', 'fruity.stone', 'sweet.maple'],
  'port': ['sweet.caramel', 'fruity.berry', 'boozy.brandy'],
  'madeira': ['sweet.caramel', 'fruity.stone'],
  
  'sugar': ['sweet.honey'],
  'sugar cube': ['sweet.honey'],
  'brown sugar': ['sweet.caramel', 'sweet.maple'],
};

export function deriveFlavorFromIngredients(ingredients: Array<{name: string; amount?: string}>): { categories: string[]; notes: string[] } {
  const categorySet = new Set<string>();
  const noteSet = new Set<string>();
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    
    for (const [keyword, noteIds] of Object.entries(INGREDIENT_FLAVOR_MAP)) {
      if (name.includes(keyword) || keyword.includes(name)) {
        for (const noteId of noteIds) {
          noteSet.add(noteId);
          const catId = noteId.split('.')[0];
          categorySet.add(catId);
        }
      }
    }
    
    const words = name.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      for (const [keyword, noteIds] of Object.entries(INGREDIENT_FLAVOR_MAP)) {
        if (keyword === word) {
          for (const noteId of noteIds) {
            noteSet.add(noteId);
            const catId = noteId.split('.')[0];
            categorySet.add(catId);
          }
        }
      }
    }
  }
  
  return {
    categories: Array.from(categorySet),
    notes: Array.from(noteSet)
  };
}

export function flavorProfileToSelection(profile: Record<string, number>): { categories: string[]; notes: string[] } {
  const categories: string[] = [];
  const THRESHOLD = 4;
  
  Object.entries(profile).forEach(([key, value]) => {
    if (typeof value === 'number' && value >= THRESHOLD) {
      const cat = FLAVOR_TAXONOMY.find(c => c.label.toLowerCase() === key.toLowerCase());
      if (cat) {
        categories.push(cat.id);
      }
    }
  });
  
  return { categories, notes: [] };
}

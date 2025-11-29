export interface FlavorNote {
  id: string;
  label: string;
}

export interface FlavorSubcategory {
  id: string;
  label: string;
  notes: FlavorNote[];
}

export interface FlavorCategory {
  id: string;
  label: string;
  color: string;
  subcategories: FlavorSubcategory[];
  notes: FlavorNote[];
}

export const FLAVOR_TAXONOMY: FlavorCategory[] = [
  {
    id: 'sweet',
    label: 'Sweet',
    color: '#f59e0b',
    subcategories: [
      {
        id: 'sweet.rich',
        label: 'Rich',
        notes: [
          { id: 'sweet.rich.coffee', label: 'Coffee' },
          { id: 'sweet.rich.chocolate', label: 'Choco' },
          { id: 'sweet.rich.maple', label: 'Maple' },
          { id: 'sweet.rich.caramel', label: 'Caramel' },
          { id: 'sweet.rich.honey', label: 'Honey' },
        ]
      },
      {
        id: 'sweet.sugar',
        label: 'Sugar',
        notes: [
          { id: 'sweet.sugar.molasses', label: 'Molasses' },
          { id: 'sweet.sugar.brown', label: 'Brown' },
          { id: 'sweet.sugar.simple', label: 'Simple' },
        ]
      },
      {
        id: 'sweet.nutty',
        label: 'Nutty',
        notes: [
          { id: 'sweet.nutty.vanilla', label: 'Vanilla' },
          { id: 'sweet.nutty.almond', label: 'Almond' },
          { id: 'sweet.nutty.walnut', label: 'Walnut' },
          { id: 'sweet.nutty.pecan', label: 'Pecan' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'fruity',
    label: 'Fruity',
    color: '#ec4899',
    subcategories: [
      {
        id: 'fruity.citrus',
        label: 'Citrus',
        notes: [
          { id: 'fruity.citrus.lemon', label: 'Lemon' },
          { id: 'fruity.citrus.lime', label: 'Lime' },
          { id: 'fruity.citrus.grapefruit', label: 'Grapefrt' },
          { id: 'fruity.citrus.orange', label: 'Orange' },
        ]
      },
      {
        id: 'fruity.berry',
        label: 'Berry',
        notes: [
          { id: 'fruity.berry.raspberry', label: 'Raspbry' },
          { id: 'fruity.berry.strawberry', label: 'Strawbry' },
          { id: 'fruity.berry.blackberry', label: 'Blackbry' },
          { id: 'fruity.berry.cranberry', label: 'Cranbry' },
        ]
      },
      {
        id: 'fruity.tree',
        label: 'Tree',
        notes: [
          { id: 'fruity.tree.apple', label: 'Apple' },
          { id: 'fruity.tree.pear', label: 'Pear' },
          { id: 'fruity.tree.peach', label: 'Peach' },
          { id: 'fruity.tree.cherry', label: 'Cherry' },
        ]
      },
      {
        id: 'fruity.tropic',
        label: 'Tropic',
        notes: [
          { id: 'fruity.tropic.pineapple', label: 'Pineapl' },
          { id: 'fruity.tropic.mango', label: 'Mango' },
          { id: 'fruity.tropic.coconut', label: 'Coconut' },
          { id: 'fruity.tropic.passion', label: 'Passion' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'floral',
    label: 'Floral',
    color: '#c084fc',
    subcategories: [
      {
        id: 'floral.flower',
        label: 'Flower',
        notes: [
          { id: 'floral.flower.rose', label: 'Rose' },
          { id: 'floral.flower.lavender', label: 'Lavndr' },
          { id: 'floral.flower.elderflower', label: 'Eldflwr' },
          { id: 'floral.flower.violet', label: 'Violet' },
        ]
      },
      {
        id: 'floral.fresh',
        label: 'Fresh',
        notes: [
          { id: 'floral.fresh.mint', label: 'Mint' },
          { id: 'floral.fresh.basil', label: 'Basil' },
          { id: 'floral.fresh.thyme', label: 'Thyme' },
          { id: 'floral.fresh.sage', label: 'Sage' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'herbal',
    label: 'Herbal',
    color: '#22c55e',
    subcategories: [
      {
        id: 'herbal.veg',
        label: 'Veg',
        notes: [
          { id: 'herbal.veg.celery', label: 'Celery' },
          { id: 'herbal.veg.cucumber', label: 'Cucmbr' },
          { id: 'herbal.veg.tomato', label: 'Tomato' },
          { id: 'herbal.veg.grass', label: 'Grass' },
        ]
      },
      {
        id: 'herbal.bitter',
        label: 'Bitter',
        notes: [
          { id: 'herbal.bitter.amaro', label: 'Amaro' },
          { id: 'herbal.bitter.gentian', label: 'Gentian' },
          { id: 'herbal.bitter.wormwood', label: 'Wrmwood' },
          { id: 'herbal.bitter.quinine', label: 'Quinine' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'spicy',
    label: 'Spicy',
    color: '#f97316',
    subcategories: [
      {
        id: 'spicy.hot',
        label: 'Hot',
        notes: [
          { id: 'spicy.hot.pepper', label: 'Pepper' },
          { id: 'spicy.hot.chili', label: 'Chili' },
          { id: 'spicy.hot.ginger', label: 'Ginger' },
          { id: 'spicy.hot.jalapeño', label: 'Jalapeño' },
        ]
      },
      {
        id: 'spicy.warm',
        label: 'Warm',
        notes: [
          { id: 'spicy.warm.nutmeg', label: 'Nutmeg' },
          { id: 'spicy.warm.clove', label: 'Clove' },
          { id: 'spicy.warm.cinnamon', label: 'Cinnamn' },
          { id: 'spicy.warm.allspice', label: 'Allspice' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'earthy',
    label: 'Earthy',
    color: '#78716c',
    subcategories: [
      {
        id: 'earthy.smoky',
        label: 'Smoky',
        notes: [
          { id: 'earthy.smoky.peat', label: 'Peat' },
          { id: 'earthy.smoky.charcoal', label: 'Charcol' },
          { id: 'earthy.smoky.smoke', label: 'Smoke' },
          { id: 'earthy.smoky.tobacco', label: 'Tobacco' },
        ]
      },
      {
        id: 'earthy.woody',
        label: 'Woody',
        notes: [
          { id: 'earthy.woody.pine', label: 'Pine' },
          { id: 'earthy.woody.cedar', label: 'Cedar' },
          { id: 'earthy.woody.oak', label: 'Oak' },
          { id: 'earthy.woody.leather', label: 'Leather' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'sour',
    label: 'Sour',
    color: '#84cc16',
    subcategories: [
      {
        id: 'sour.acidic',
        label: 'Acidic',
        notes: [
          { id: 'sour.acidic.tart', label: 'Tart' },
          { id: 'sour.acidic.tangy', label: 'Tangy' },
          { id: 'sour.acidic.sharp', label: 'Sharp' },
        ]
      },
      {
        id: 'sour.fermented',
        label: 'Ferment',
        notes: [
          { id: 'sour.fermented.vinegar', label: 'Vinegar' },
          { id: 'sour.fermented.wine', label: 'Wine' },
          { id: 'sour.fermented.shrub', label: 'Shrub' },
        ]
      }
    ],
    notes: []
  },
  {
    id: 'boozy',
    label: 'Boozy',
    color: '#a78bfa',
    subcategories: [
      {
        id: 'boozy.aged',
        label: 'Aged',
        notes: [
          { id: 'boozy.aged.whiskey', label: 'Whiskey' },
          { id: 'boozy.aged.brandy', label: 'Brandy' },
          { id: 'boozy.aged.rum', label: 'Rum' },
          { id: 'boozy.aged.tequila', label: 'Tequila' },
        ]
      },
      {
        id: 'boozy.clear',
        label: 'Clear',
        notes: [
          { id: 'boozy.clear.gin', label: 'Gin' },
          { id: 'boozy.clear.vodka', label: 'Vodka' },
          { id: 'boozy.clear.mezcal', label: 'Mezcal' },
          { id: 'boozy.clear.pisco', label: 'Pisco' },
        ]
      }
    ],
    notes: []
  },
];

export function getAllNotes(): FlavorNote[] {
  const notes: FlavorNote[] = [];
  FLAVOR_TAXONOMY.forEach(cat => {
    cat.subcategories.forEach(sub => {
      notes.push(...sub.notes);
    });
    notes.push(...cat.notes);
  });
  return notes;
}

export function getAllSubcategories(): FlavorSubcategory[] {
  const subs: FlavorSubcategory[] = [];
  FLAVOR_TAXONOMY.forEach(cat => {
    subs.push(...cat.subcategories);
  });
  return subs;
}

export function getCategoryForNote(noteId: string): FlavorCategory | undefined {
  const parts = noteId.split('.');
  if (parts.length < 2) return undefined;
  return FLAVOR_TAXONOMY.find(c => c.id === parts[0]);
}

export function getSubcategoryForNote(noteId: string): FlavorSubcategory | undefined {
  const parts = noteId.split('.');
  if (parts.length < 3) return undefined;
  const cat = FLAVOR_TAXONOMY.find(c => c.id === parts[0]);
  if (!cat) return undefined;
  return cat.subcategories.find(s => s.id === `${parts[0]}.${parts[1]}`);
}

export interface FlavorSelection {
  categories: Set<string>;
  subcategories: Set<string>;
  notes: Set<string>;
}

export function createEmptySelection(): FlavorSelection {
  return {
    categories: new Set(),
    subcategories: new Set(),
    notes: new Set(),
  };
}

export function getSelectedLabels(selection: FlavorSelection): string[] {
  const labels: string[] = [];
  
  FLAVOR_TAXONOMY.forEach(cat => {
    cat.subcategories.forEach(sub => {
      const selectedNotes = sub.notes.filter(n => selection.notes.has(n.id));
      if (selectedNotes.length > 0) {
        selectedNotes.forEach(n => labels.push(n.label));
      } else if (selection.subcategories.has(sub.id)) {
        labels.push(sub.label);
      }
    });
    if (selection.categories.has(cat.id) && labels.length === 0) {
      labels.push(cat.label);
    }
  });
  
  return labels;
}

export function selectionToFlavorProfile(
  selection: FlavorSelection, 
  baseProfile?: Record<string, number>,
  initialCategories?: Set<string>
): Record<string, number> {
  const defaultBase: Record<string, number> = {
    Sweet: 0, Fruity: 0, Floral: 0, Herbal: 0,
    Spicy: 0, Earthy: 0, Sour: 0, Boozy: 0
  };
  const base = baseProfile || defaultBase;
  
  const profile: Record<string, number> = { ...base };
  
  FLAVOR_TAXONOMY.forEach(cat => {
    const categorySelected = selection.categories.has(cat.id);
    const wasInitiallySelected = initialCategories?.has(cat.id) ?? false;
    
    let noteCount = 0;
    cat.subcategories.forEach(sub => {
      noteCount += sub.notes.filter(n => selection.notes.has(n.id)).length;
    });
    
    if (noteCount > 0) {
      profile[cat.label] = Math.min(10, base[cat.label] + noteCount * 1.5);
    } else if (categorySelected) {
      if (wasInitiallySelected) {
        profile[cat.label] = base[cat.label];
      } else {
        profile[cat.label] = Math.max(5, base[cat.label]);
      }
    } else {
      if (wasInitiallySelected) {
        profile[cat.label] = Math.max(0, base[cat.label] - 2);
      }
    }
  });
  
  return profile;
}

const INGREDIENT_FLAVOR_MAP: Record<string, string[]> = {
  'bourbon': ['boozy.aged.whiskey', 'sweet.rich.caramel', 'sweet.nutty.vanilla', 'earthy.smoky.charcoal'],
  'rye': ['boozy.aged.whiskey', 'spicy.hot.pepper', 'earthy.smoky.charcoal'],
  'rye whiskey': ['boozy.aged.whiskey', 'spicy.hot.pepper', 'earthy.smoky.charcoal'],
  'whiskey': ['boozy.aged.whiskey', 'earthy.smoky.charcoal'],
  'scotch': ['boozy.aged.whiskey', 'earthy.smoky.peat'],
  'islay scotch': ['boozy.aged.whiskey', 'earthy.smoky.peat', 'earthy.smoky.charcoal'],
  'irish whiskey': ['boozy.aged.whiskey', 'sweet.rich.honey'],
  'japanese whisky': ['boozy.aged.whiskey', 'sweet.rich.honey', 'fruity.tree.apple'],
  
  'rum': ['boozy.aged.rum', 'sweet.rich.caramel'],
  'white rum': ['boozy.aged.rum'],
  'dark rum': ['boozy.aged.rum', 'sweet.rich.caramel', 'sweet.sugar.molasses', 'earthy.smoky.charcoal'],
  'aged rum': ['boozy.aged.rum', 'sweet.rich.caramel', 'sweet.nutty.vanilla'],
  'spiced rum': ['boozy.aged.rum', 'spicy.warm.cinnamon', 'spicy.warm.clove', 'sweet.nutty.vanilla'],
  'overproof rum': ['boozy.aged.rum'],
  'jamaican rum': ['boozy.aged.rum', 'fruity.tropic.pineapple'],
  'demerara rum': ['boozy.aged.rum', 'sweet.rich.caramel'],
  'rhum agricole': ['boozy.aged.rum', 'herbal.veg.grass', 'fruity.tropic.pineapple'],
  
  'gin': ['boozy.clear.gin', 'floral.fresh.thyme', 'fruity.citrus.lemon'],
  'london dry gin': ['boozy.clear.gin', 'floral.fresh.thyme'],
  'old tom gin': ['boozy.clear.gin', 'sweet.rich.honey'],
  'sloe gin': ['boozy.clear.gin', 'fruity.berry.blackberry'],
  'navy strength gin': ['boozy.clear.gin', 'floral.fresh.thyme'],
  
  'vodka': ['boozy.clear.vodka'],
  
  'tequila': ['boozy.aged.tequila', 'herbal.veg.grass', 'spicy.hot.pepper'],
  'blanco tequila': ['boozy.aged.tequila', 'spicy.hot.pepper', 'fruity.citrus.lime'],
  'reposado tequila': ['boozy.aged.tequila', 'sweet.nutty.vanilla', 'spicy.hot.pepper'],
  'anejo tequila': ['boozy.aged.tequila', 'sweet.rich.caramel', 'sweet.nutty.vanilla'],
  'mezcal': ['earthy.smoky.peat', 'earthy.smoky.smoke', 'boozy.clear.mezcal', 'fruity.tropic.mango'],
  
  'brandy': ['boozy.aged.brandy', 'fruity.tree.peach', 'sweet.rich.caramel'],
  'cognac': ['boozy.aged.brandy', 'fruity.tree.peach', 'sweet.nutty.vanilla', 'sweet.rich.caramel'],
  'armagnac': ['boozy.aged.brandy', 'fruity.tree.peach', 'sweet.rich.caramel'],
  'calvados': ['boozy.aged.brandy', 'fruity.tree.apple'],
  'pisco': ['boozy.clear.pisco', 'fruity.tropic.mango'],
  'applejack': ['boozy.aged.brandy', 'fruity.tree.apple', 'sweet.rich.caramel'],
  
  'vermouth': ['floral.fresh.thyme', 'herbal.bitter.amaro'],
  'sweet vermouth': ['sweet.rich.caramel', 'floral.fresh.thyme', 'herbal.bitter.amaro', 'spicy.warm.clove'],
  'dry vermouth': ['floral.fresh.thyme', 'fruity.citrus.lemon'],
  'blanc vermouth': ['floral.fresh.thyme', 'sweet.rich.honey'],
  
  'campari': ['herbal.bitter.amaro', 'fruity.citrus.orange', 'sweet.rich.caramel'],
  'aperol': ['fruity.citrus.orange', 'sweet.rich.honey', 'fruity.tree.peach'],
  'cynar': ['herbal.bitter.amaro', 'floral.fresh.thyme'],
  'fernet': ['herbal.bitter.amaro', 'floral.fresh.mint', 'spicy.hot.pepper'],
  'fernet branca': ['herbal.bitter.amaro', 'floral.fresh.mint', 'spicy.hot.pepper'],
  'amaro': ['herbal.bitter.amaro', 'sweet.rich.caramel', 'floral.fresh.thyme'],
  'averna': ['herbal.bitter.amaro', 'sweet.rich.caramel'],
  'montenegro': ['herbal.bitter.amaro', 'sweet.rich.honey'],
  
  'bitters': ['herbal.bitter.amaro', 'spicy.warm.clove'],
  'angostura': ['herbal.bitter.amaro', 'spicy.warm.clove', 'spicy.warm.cinnamon'],
  'angostura bitters': ['herbal.bitter.amaro', 'spicy.warm.clove', 'spicy.warm.cinnamon'],
  'peychaud': ['herbal.bitter.amaro', 'floral.fresh.basil', 'sweet.rich.honey'],
  "peychaud's": ['herbal.bitter.amaro', 'floral.fresh.basil', 'sweet.rich.honey'],
  "peychaud's bitters": ['herbal.bitter.amaro', 'floral.fresh.basil', 'sweet.rich.honey'],
  'orange bitters': ['fruity.citrus.orange', 'herbal.bitter.amaro'],
  'chocolate bitters': ['sweet.rich.chocolate', 'sweet.nutty.vanilla'],
  'mole bitters': ['sweet.rich.chocolate', 'spicy.hot.chili'],
  'coffee bitters': ['sweet.rich.coffee', 'earthy.smoky.charcoal'],
  
  'absinthe': ['floral.fresh.basil', 'floral.fresh.thyme', 'herbal.bitter.wormwood'],
  'pastis': ['floral.fresh.basil', 'sweet.rich.honey'],
  'pernod': ['floral.fresh.basil', 'sweet.rich.honey'],
  'herbsaint': ['floral.fresh.basil', 'floral.fresh.thyme'],
  
  'chartreuse': ['floral.fresh.thyme', 'floral.fresh.basil', 'sweet.rich.honey'],
  'green chartreuse': ['floral.fresh.thyme', 'floral.fresh.basil', 'herbal.bitter.amaro'],
  'yellow chartreuse': ['floral.fresh.thyme', 'sweet.rich.honey'],
  'benedictine': ['floral.fresh.thyme', 'sweet.rich.honey', 'spicy.warm.clove'],
  'drambuie': ['sweet.rich.honey', 'floral.fresh.thyme', 'boozy.aged.whiskey'],
  'st germain': ['floral.flower.elderflower', 'sweet.rich.honey', 'fruity.tropic.mango'],
  'elderflower': ['floral.flower.elderflower', 'sweet.rich.honey', 'fruity.tropic.mango'],
  
  'triple sec': ['fruity.citrus.orange', 'sweet.rich.honey'],
  'cointreau': ['fruity.citrus.orange', 'sweet.rich.honey'],
  'curacao': ['fruity.citrus.orange', 'sweet.rich.caramel'],
  'grand marnier': ['fruity.citrus.orange', 'boozy.aged.brandy', 'sweet.rich.caramel'],
  'limoncello': ['fruity.citrus.lemon', 'sweet.rich.honey'],
  
  'maraschino': ['fruity.tree.cherry', 'sweet.rich.honey', 'herbal.bitter.amaro'],
  'luxardo': ['fruity.tree.cherry', 'sweet.rich.honey'],
  'kirsch': ['fruity.tree.cherry', 'boozy.aged.brandy'],
  'creme de cassis': ['fruity.berry.blackberry', 'sweet.rich.caramel'],
  'chambord': ['fruity.berry.raspberry', 'sweet.rich.honey'],
  'creme de mure': ['fruity.berry.blackberry', 'sweet.rich.caramel'],
  
  'kahlua': ['sweet.rich.coffee', 'sweet.nutty.vanilla', 'sweet.rich.caramel'],
  'coffee liqueur': ['sweet.rich.coffee', 'sweet.nutty.vanilla'],
  'creme de cacao': ['sweet.rich.chocolate', 'sweet.nutty.vanilla'],
  'amaretto': ['sweet.nutty.almond', 'herbal.bitter.amaro', 'fruity.tree.cherry'],
  'frangelico': ['sweet.nutty.walnut', 'sweet.nutty.vanilla'],
  
  'falernum': ['spicy.warm.clove', 'spicy.hot.ginger', 'sweet.rich.honey', 'fruity.citrus.lime'],
  'allspice dram': ['spicy.warm.allspice', 'spicy.warm.cinnamon', 'sweet.rich.caramel'],
  'velvet falernum': ['spicy.warm.clove', 'spicy.hot.ginger', 'sweet.rich.honey'],
  
  'grenadine': ['fruity.berry.raspberry', 'sweet.rich.caramel'],
  'orgeat': ['sweet.nutty.almond', 'sweet.nutty.vanilla'],
  'simple syrup': ['sweet.sugar.simple'],
  'demerara syrup': ['sweet.sugar.brown', 'sweet.rich.caramel'],
  'honey syrup': ['sweet.rich.honey'],
  'honey': ['sweet.rich.honey'],
  'maple syrup': ['sweet.rich.maple', 'sweet.rich.caramel'],
  'agave': ['sweet.sugar.simple'],
  'agave syrup': ['sweet.sugar.simple'],
  'agave nectar': ['sweet.sugar.simple'],
  'cinnamon syrup': ['spicy.warm.cinnamon', 'sweet.sugar.simple'],
  'ginger syrup': ['spicy.hot.ginger', 'sweet.sugar.simple'],
  
  'lemon': ['fruity.citrus.lemon', 'sour.acidic.tart'],
  'lemon juice': ['fruity.citrus.lemon', 'sour.acidic.tart'],
  'lime': ['fruity.citrus.lime', 'sour.acidic.tart'],
  'lime juice': ['fruity.citrus.lime', 'sour.acidic.tart'],
  'orange': ['fruity.citrus.orange', 'sweet.rich.honey'],
  'orange juice': ['fruity.citrus.orange', 'sweet.rich.honey'],
  'grapefruit': ['fruity.citrus.grapefruit', 'sour.acidic.tart'],
  'grapefruit juice': ['fruity.citrus.grapefruit', 'sour.acidic.tart'],
  
  'pineapple': ['fruity.tropic.pineapple', 'sour.acidic.tart'],
  'pineapple juice': ['fruity.tropic.pineapple', 'sour.acidic.tart'],
  'passion fruit': ['fruity.tropic.passion', 'sour.acidic.tangy'],
  'mango': ['fruity.tropic.mango', 'sweet.rich.honey'],
  'coconut': ['fruity.tropic.coconut', 'sweet.nutty.vanilla'],
  'coconut cream': ['fruity.tropic.coconut', 'sweet.nutty.vanilla'],
  'banana': ['fruity.tropic.mango', 'sweet.rich.honey'],
  
  'strawberry': ['fruity.berry.strawberry', 'sweet.rich.honey'],
  'raspberry': ['fruity.berry.raspberry', 'sour.acidic.tart'],
  'blackberry': ['fruity.berry.blackberry', 'sour.acidic.tart'],
  'cranberry': ['fruity.berry.cranberry', 'sour.acidic.tart', 'herbal.bitter.amaro'],
  'cherry': ['fruity.tree.cherry', 'sweet.rich.honey'],
  'peach': ['fruity.tree.peach', 'sweet.rich.honey'],
  'apricot': ['fruity.tree.peach', 'sweet.rich.honey'],
  'apple': ['fruity.tree.apple', 'sour.acidic.tart'],
  'pear': ['fruity.tree.pear', 'sweet.rich.honey'],
  
  'mint': ['floral.fresh.mint'],
  'fresh mint': ['floral.fresh.mint'],
  'mint leaves': ['floral.fresh.mint'],
  'basil': ['floral.fresh.basil'],
  'fresh basil': ['floral.fresh.basil'],
  'rosemary': ['floral.fresh.thyme'],
  'thyme': ['floral.fresh.thyme'],
  'sage': ['floral.fresh.sage'],
  'lavender': ['floral.flower.lavender', 'sweet.rich.honey'],
  'cucumber': ['herbal.veg.cucumber', 'sour.acidic.tart'],
  
  'ginger': ['spicy.hot.ginger'],
  'ginger beer': ['spicy.hot.ginger', 'sweet.sugar.simple'],
  'pepper': ['spicy.hot.pepper'],
  'black pepper': ['spicy.hot.pepper'],
  'chili': ['spicy.hot.chili'],
  'jalapeno': ['spicy.hot.jalapeño'],
  'cayenne': ['spicy.hot.chili'],
  'cinnamon': ['spicy.warm.cinnamon', 'sweet.rich.honey'],
  'clove': ['spicy.warm.clove'],
  'nutmeg': ['spicy.warm.nutmeg', 'sweet.rich.honey'],
  'allspice': ['spicy.warm.allspice', 'spicy.warm.cinnamon'],
  'cardamom': ['spicy.warm.clove', 'floral.fresh.thyme'],
  'star anise': ['floral.fresh.basil', 'sweet.rich.honey'],
  
  'coffee': ['sweet.rich.coffee'],
  'espresso': ['sweet.rich.coffee', 'sweet.rich.chocolate'],
  'cold brew': ['sweet.rich.coffee'],
  'chocolate': ['sweet.rich.chocolate', 'sweet.nutty.vanilla'],
  'cocoa': ['sweet.rich.chocolate'],
  'cacao': ['sweet.rich.chocolate'],
  
  'smoke': ['earthy.smoky.smoke'],
  'smoked': ['earthy.smoky.smoke'],
  'tobacco': ['earthy.smoky.tobacco'],
  'leather': ['earthy.woody.leather'],
  
  'egg white': ['sweet.nutty.vanilla'],
  'aquafaba': ['sweet.nutty.vanilla'],
  'cream': ['sweet.nutty.vanilla', 'sweet.rich.caramel'],
  'heavy cream': ['sweet.nutty.vanilla'],
  
  'prosecco': ['fruity.tree.apple', 'sour.acidic.tart'],
  'champagne': ['fruity.tree.apple', 'sour.acidic.tart'],
  'sparkling wine': ['fruity.tree.apple', 'sour.acidic.tart'],
  'soda': [],
  'club soda': [],
  'tonic': ['herbal.bitter.quinine', 'sour.acidic.tart'],
  'tonic water': ['herbal.bitter.quinine', 'sour.acidic.tart'],
  'cola': ['sweet.rich.caramel', 'spicy.warm.cinnamon'],
  
  'sherry': ['sweet.rich.caramel', 'fruity.tree.peach'],
  'fino sherry': ['sour.fermented.wine', 'herbal.bitter.amaro'],
  'oloroso sherry': ['sweet.rich.caramel', 'fruity.tree.peach'],
  'pedro ximenez': ['sweet.rich.caramel', 'fruity.tree.peach', 'sweet.rich.maple'],
  'port': ['sweet.rich.caramel', 'fruity.berry.blackberry', 'boozy.aged.brandy'],
  'madeira': ['sweet.rich.caramel', 'fruity.tree.peach'],
  
  'sugar': ['sweet.sugar.simple'],
  'sugar cube': ['sweet.sugar.simple'],
  'brown sugar': ['sweet.sugar.brown', 'sweet.rich.maple'],
};

export function deriveFlavorFromIngredients(ingredients: Array<{name: string; amount?: string}>): { categories: string[]; subcategories: string[]; notes: string[] } {
  const categorySet = new Set<string>();
  const subcategorySet = new Set<string>();
  const noteSet = new Set<string>();
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    
    for (const [keyword, noteIds] of Object.entries(INGREDIENT_FLAVOR_MAP)) {
      if (name.includes(keyword) || keyword.includes(name)) {
        for (const noteId of noteIds) {
          noteSet.add(noteId);
          const parts = noteId.split('.');
          if (parts.length >= 2) categorySet.add(parts[0]);
          if (parts.length >= 3) subcategorySet.add(`${parts[0]}.${parts[1]}`);
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
            const parts = noteId.split('.');
            if (parts.length >= 2) categorySet.add(parts[0]);
            if (parts.length >= 3) subcategorySet.add(`${parts[0]}.${parts[1]}`);
          }
        }
      }
    }
  }
  
  return {
    categories: Array.from(categorySet),
    subcategories: Array.from(subcategorySet),
    notes: Array.from(noteSet)
  };
}

export function flavorProfileToSelection(profile: Record<string, number>): { categories: string[]; subcategories: string[]; notes: string[] } {
  const categories: string[] = [];
  
  const entries = Object.entries(profile)
    .filter(([_, value]) => typeof value === 'number' && value > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  
  const topValues = entries.slice(0, 3).map(([_, v]) => v as number);
  const minTopValue = Math.min(...topValues);
  const STRONG_THRESHOLD = Math.max(5, minTopValue - 1);
  
  entries.forEach(([key, value]) => {
    if (typeof value === 'number' && value >= STRONG_THRESHOLD) {
      const cat = FLAVOR_TAXONOMY.find(c => c.label.toLowerCase() === key.toLowerCase());
      if (cat) {
        categories.push(cat.id);
      }
    }
  });
  
  return { categories, subcategories: [], notes: [] };
}

export const LEGACY_NOTE_MAP: Record<string, string> = {
  'sweet.honey': 'sweet.rich.honey',
  'sweet.caramel': 'sweet.rich.caramel',
  'sweet.vanilla': 'sweet.nutty.vanilla',
  'sweet.maple': 'sweet.rich.maple',
  'sour.citrus': 'fruity.citrus.lemon',
  'sour.tart': 'sour.acidic.tart',
  'sour.vinegar': 'sour.fermented.vinegar',
  'sour.fermented': 'sour.fermented.wine',
  'bitter.coffee': 'sweet.rich.coffee',
  'bitter.chocolate': 'sweet.rich.chocolate',
  'bitter.herbal': 'herbal.bitter.amaro',
  'bitter.citrus': 'fruity.citrus.grapefruit',
  'boozy.whiskey': 'boozy.aged.whiskey',
  'boozy.rum': 'boozy.aged.rum',
  'boozy.brandy': 'boozy.aged.brandy',
  'boozy.gin': 'boozy.clear.gin',
  'herbal.mint': 'floral.fresh.mint',
  'herbal.basil': 'floral.fresh.basil',
  'herbal.rosemary': 'floral.fresh.thyme',
  'herbal.thyme': 'floral.fresh.thyme',
  'fruity.berry': 'fruity.berry.raspberry',
  'fruity.tropical': 'fruity.tropic.pineapple',
  'fruity.stone': 'fruity.tree.peach',
  'fruity.apple': 'fruity.tree.apple',
  'spicy.pepper': 'spicy.hot.pepper',
  'spicy.cinnamon': 'spicy.warm.cinnamon',
  'spicy.ginger': 'spicy.hot.ginger',
  'spicy.clove': 'spicy.warm.clove',
  'smoky.peat': 'earthy.smoky.peat',
  'smoky.charred': 'earthy.smoky.charcoal',
  'smoky.tobacco': 'earthy.smoky.tobacco',
  'smoky.leather': 'earthy.woody.leather',
};

export function migrateLegacyNoteId(oldId: string): string {
  return LEGACY_NOTE_MAP[oldId] || oldId;
}

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

export function selectionToFlavorProfile(selection: FlavorSelection): Record<string, number> {
  const profile: Record<string, number> = {
    Sweet: 0, Sour: 0, Bitter: 0, Boozy: 0,
    Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0
  };
  
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

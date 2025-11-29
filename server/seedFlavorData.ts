import { db } from './db';
import { 
  flavorCategories, 
  flavorNotes, 
  ingredientFlavorMappings,
  flavorDataVersion 
} from '../shared/schema';
import { sql } from 'drizzle-orm';

const FLAVOR_CATEGORIES = [
  { id: 'sweet', label: 'Sweet', color: '#f59e0b', sortOrder: 1, description: 'Sugary, syrupy, honeyed sweetness' },
  { id: 'sour', label: 'Sour', color: '#84cc16', sortOrder: 2, description: 'Acidic, tart, citric sourness' },
  { id: 'bitter', label: 'Bitter', color: '#14b8a6', sortOrder: 3, description: 'Sharp, complex bitterness from amaro, coffee, or citrus peel' },
  { id: 'boozy', label: 'Boozy', color: '#a78bfa', sortOrder: 4, description: 'Strong alcohol presence and spirit character' },
  { id: 'herbal', label: 'Herbal', color: '#22c55e', sortOrder: 5, description: 'Fresh herbs, botanical, vegetal notes' },
  { id: 'fruity', label: 'Fruity', color: '#ec4899', sortOrder: 6, description: 'Fresh or cooked fruit flavors' },
  { id: 'spicy', label: 'Spicy', color: '#f97316', sortOrder: 7, description: 'Warm spices, heat, pungency' },
  { id: 'smoky', label: 'Smoky', color: '#78716c', sortOrder: 8, description: 'Smoke, char, peat, tobacco notes' },
];

const FLAVOR_NOTES = [
  { id: 'sweet.honey', categoryId: 'sweet', label: 'Honey', sortOrder: 1, keywords: ['honey', 'mead', 'honeycomb'] },
  { id: 'sweet.caramel', categoryId: 'sweet', label: 'Caramel', sortOrder: 2, keywords: ['caramel', 'toffee', 'butterscotch', 'dulce'] },
  { id: 'sweet.vanilla', categoryId: 'sweet', label: 'Vanilla', sortOrder: 3, keywords: ['vanilla', 'vanillin', 'cream'] },
  { id: 'sweet.maple', categoryId: 'sweet', label: 'Maple', sortOrder: 4, keywords: ['maple', 'brown sugar', 'molasses'] },
  
  { id: 'sour.citrus', categoryId: 'sour', label: 'Citrus', sortOrder: 1, keywords: ['lemon', 'lime', 'orange', 'grapefruit', 'citrus'] },
  { id: 'sour.tart', categoryId: 'sour', label: 'Tart', sortOrder: 2, keywords: ['tart', 'acidic', 'bright', 'tangy'] },
  { id: 'sour.vinegar', categoryId: 'sour', label: 'Vinegar', sortOrder: 3, keywords: ['vinegar', 'shrub', 'acetic'] },
  { id: 'sour.fermented', categoryId: 'sour', label: 'Fermented', sortOrder: 4, keywords: ['fermented', 'kombucha', 'funky'] },
  
  { id: 'bitter.coffee', categoryId: 'bitter', label: 'Coffee', sortOrder: 1, keywords: ['coffee', 'espresso', 'roasted'] },
  { id: 'bitter.chocolate', categoryId: 'bitter', label: 'Chocolate', sortOrder: 2, keywords: ['chocolate', 'cocoa', 'cacao', 'dark chocolate'] },
  { id: 'bitter.herbal', categoryId: 'bitter', label: 'Amaro', sortOrder: 3, keywords: ['amaro', 'digestif', 'gentian', 'artichoke'] },
  { id: 'bitter.citrus', categoryId: 'bitter', label: 'Citrus Peel', sortOrder: 4, keywords: ['zest', 'peel', 'pith', 'oils'] },
  
  { id: 'boozy.whiskey', categoryId: 'boozy', label: 'Whiskey', sortOrder: 1, keywords: ['whiskey', 'bourbon', 'rye', 'scotch', 'irish'] },
  { id: 'boozy.rum', categoryId: 'boozy', label: 'Rum', sortOrder: 2, keywords: ['rum', 'cachaca', 'rhum', 'agricole'] },
  { id: 'boozy.brandy', categoryId: 'boozy', label: 'Brandy', sortOrder: 3, keywords: ['brandy', 'cognac', 'armagnac', 'pisco', 'calvados'] },
  { id: 'boozy.gin', categoryId: 'boozy', label: 'Gin', sortOrder: 4, keywords: ['gin', 'juniper', 'botanical'] },
  
  { id: 'herbal.mint', categoryId: 'herbal', label: 'Mint', sortOrder: 1, keywords: ['mint', 'peppermint', 'spearmint', 'menthol'] },
  { id: 'herbal.basil', categoryId: 'herbal', label: 'Basil', sortOrder: 2, keywords: ['basil', 'anise', 'licorice', 'elderflower'] },
  { id: 'herbal.rosemary', categoryId: 'herbal', label: 'Rosemary', sortOrder: 3, keywords: ['rosemary', 'sage', 'savory', 'pine'] },
  { id: 'herbal.thyme', categoryId: 'herbal', label: 'Thyme', sortOrder: 4, keywords: ['thyme', 'oregano', 'vermouth', 'chartreuse'] },
  
  { id: 'fruity.berry', categoryId: 'fruity', label: 'Berry', sortOrder: 1, keywords: ['berry', 'strawberry', 'raspberry', 'blackberry', 'blueberry'] },
  { id: 'fruity.tropical', categoryId: 'fruity', label: 'Tropical', sortOrder: 2, keywords: ['tropical', 'pineapple', 'passion', 'mango', 'coconut', 'banana'] },
  { id: 'fruity.stone', categoryId: 'fruity', label: 'Stone Fruit', sortOrder: 3, keywords: ['peach', 'apricot', 'cherry', 'plum', 'nectarine'] },
  { id: 'fruity.apple', categoryId: 'fruity', label: 'Apple/Pear', sortOrder: 4, keywords: ['apple', 'pear', 'quince', 'cidery'] },
  
  { id: 'spicy.pepper', categoryId: 'spicy', label: 'Pepper', sortOrder: 1, keywords: ['pepper', 'chili', 'jalapeno', 'habanero', 'cayenne', 'heat'] },
  { id: 'spicy.cinnamon', categoryId: 'spicy', label: 'Cinnamon', sortOrder: 2, keywords: ['cinnamon', 'cassia', 'warm'] },
  { id: 'spicy.ginger', categoryId: 'spicy', label: 'Ginger', sortOrder: 3, keywords: ['ginger', 'galangal', 'zesty'] },
  { id: 'spicy.clove', categoryId: 'spicy', label: 'Clove', sortOrder: 4, keywords: ['clove', 'allspice', 'nutmeg', 'cardamom', 'baking spice'] },
  
  { id: 'smoky.peat', categoryId: 'smoky', label: 'Peat', sortOrder: 1, keywords: ['peat', 'peaty', 'islay', 'earthy'] },
  { id: 'smoky.charred', categoryId: 'smoky', label: 'Charred', sortOrder: 2, keywords: ['char', 'charred', 'burnt', 'toasted', 'oak'] },
  { id: 'smoky.tobacco', categoryId: 'smoky', label: 'Tobacco', sortOrder: 3, keywords: ['tobacco', 'cigar', 'pipe'] },
  { id: 'smoky.leather', categoryId: 'smoky', label: 'Leather', sortOrder: 4, keywords: ['leather', 'earthy', 'musty'] },
];

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
  'dark rum': ['boozy.rum', 'sweet.caramel', 'smoky.charred'],
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

export async function seedFlavorData(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Seeding flavor categories...');
    await db.delete(ingredientFlavorMappings);
    await db.delete(flavorNotes);
    await db.delete(flavorCategories);
    
    for (const category of FLAVOR_CATEGORIES) {
      await db.insert(flavorCategories).values(category).onConflictDoUpdate({
        target: flavorCategories.id,
        set: {
          label: category.label,
          color: category.color,
          sortOrder: category.sortOrder,
          description: category.description,
          updatedAt: new Date()
        }
      });
    }
    console.log(`Seeded ${FLAVOR_CATEGORIES.length} flavor categories`);
    
    console.log('Seeding flavor notes...');
    for (const note of FLAVOR_NOTES) {
      await db.insert(flavorNotes).values(note).onConflictDoUpdate({
        target: flavorNotes.id,
        set: {
          categoryId: note.categoryId,
          label: note.label,
          sortOrder: note.sortOrder,
          keywords: note.keywords,
          updatedAt: new Date()
        }
      });
    }
    console.log(`Seeded ${FLAVOR_NOTES.length} flavor notes`);
    
    console.log('Seeding ingredient-flavor mappings...');
    let mappingCount = 0;
    for (const [ingredient, noteIds] of Object.entries(INGREDIENT_FLAVOR_MAP)) {
      for (let i = 0; i < noteIds.length; i++) {
        await db.insert(ingredientFlavorMappings).values({
          ingredientKeyword: ingredient,
          noteId: noteIds[i],
          intensity: i === 0 ? 8 : 5,
          isPrimary: i === 0,
          source: 'system'
        });
        mappingCount++;
      }
    }
    console.log(`Seeded ${mappingCount} ingredient-flavor mappings`);
    
    await db.insert(flavorDataVersion).values({
      version: '1.0.0',
      description: 'Initial seed of flavor taxonomy and ingredient mappings'
    });
    
    console.log('Flavor data seeding complete!');
    return { success: true, message: `Seeded ${FLAVOR_CATEGORIES.length} categories, ${FLAVOR_NOTES.length} notes, ${mappingCount} mappings` };
  } catch (error) {
    console.error('Error seeding flavor data:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

if (require.main === module) {
  seedFlavorData().then((result) => {
    console.log(result);
    process.exit(result.success ? 0 : 1);
  });
}

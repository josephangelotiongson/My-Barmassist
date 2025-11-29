import { db } from './db';
import { 
  flavorCategories, 
  flavorNotes, 
  flavorSubcategories,
  ingredientFlavorMappings,
  flavorDataVersion,
  globalRecipes,
  userRecipes,
  labRiffs
} from '../shared/schema';
import { sql, eq } from 'drizzle-orm';
import { FLAVOR_TAXONOMY, INGREDIENT_FLAVOR_MAP as TAXONOMY_INGREDIENT_MAP } from '../shared/flavorTaxonomy';

const FLAVOR_CATEGORIES = [
  { id: 'sweet', label: 'Sweet', color: '#f59e0b', sortOrder: 1, description: 'Sugary, syrupy, honeyed sweetness - includes rich, sugar, and nutty subcategories' },
  { id: 'fruity', label: 'Fruity', color: '#ec4899', sortOrder: 2, description: 'Fresh fruit flavors - citrus, berries, tree fruits, and tropical' },
  { id: 'floral', label: 'Floral', color: '#c084fc', sortOrder: 3, description: 'Flower and fresh herb aromatics - rose, lavender, elderflower, mint, basil' },
  { id: 'herbal', label: 'Herbal', color: '#22c55e', sortOrder: 4, description: 'Vegetal and bitter botanical notes - cucumber, grass, amaro, gentian, wormwood' },
  { id: 'spicy', label: 'Spicy', color: '#f97316', sortOrder: 5, description: 'Heat and warm spices - pepper, chili, ginger, cinnamon, clove' },
  { id: 'earthy', label: 'Earthy', color: '#78716c', sortOrder: 6, description: 'Smoke, wood, and mineral notes - peat, charcoal, oak, leather' },
  { id: 'sour', label: 'Sour', color: '#84cc16', sortOrder: 7, description: 'Acidic and fermented sourness - tart, tangy, vinegar, shrub' },
  { id: 'boozy', label: 'Boozy', color: '#a78bfa', sortOrder: 8, description: 'Spirit character and alcohol presence - whiskey, rum, brandy, gin, vodka' },
];

function generateFlavorNotes(): Array<{
  id: string;
  categoryId: string;
  label: string;
  sortOrder: number;
  keywords: string[];
  description?: string;
}> {
  const notes: Array<{
    id: string;
    categoryId: string;
    label: string;
    sortOrder: number;
    keywords: string[];
    description?: string;
  }> = [];
  
  for (const category of FLAVOR_TAXONOMY) {
    let noteOrder = 1;
    for (const subcategory of category.subcategories) {
      for (const note of subcategory.notes) {
        const keywords: string[] = [note.label.toLowerCase()];
        
        if (note.label === 'Honey') keywords.push('honeycomb', 'mead');
        if (note.label === 'Caramel') keywords.push('toffee', 'butterscotch');
        if (note.label === 'Maple') keywords.push('brown sugar');
        if (note.label === 'Molasses') keywords.push('demerara', 'muscovado');
        if (note.label === 'Vanilla') keywords.push('vanillin', 'cream');
        if (note.label === 'Almond') keywords.push('marzipan', 'amaretto');
        
        if (note.label === 'Lemon') keywords.push('citrus', 'yellow');
        if (note.label === 'Lime') keywords.push('citrus', 'green');
        if (note.label === 'Orange') keywords.push('citrus', 'curacao');
        if (note.label.includes('Grapefr')) keywords.push('citrus', 'pomelo');
        if (note.label.includes('Raspb')) keywords.push('berry', 'bramble');
        if (note.label.includes('Strawb')) keywords.push('berry');
        if (note.label.includes('Blackb')) keywords.push('berry', 'bramble');
        if (note.label.includes('Cranb')) keywords.push('berry', 'tart');
        if (note.label.includes('Pineapl')) keywords.push('tropical', 'pina');
        if (note.label === 'Mango') keywords.push('tropical');
        if (note.label === 'Coconut') keywords.push('tropical', 'cream');
        if (note.label === 'Passion') keywords.push('tropical', 'passion fruit', 'passionfruit');
        if (note.label === 'Cherry') keywords.push('stone fruit', 'maraschino');
        if (note.label === 'Peach') keywords.push('stone fruit', 'apricot');
        if (note.label === 'Apple') keywords.push('cider', 'calvados');
        if (note.label === 'Pear') keywords.push('poire');
        
        if (note.label === 'Rose') keywords.push('flower', 'rosewater');
        if (note.label.includes('Lavndr')) keywords.push('flower', 'lavender');
        if (note.label.includes('Eldflwr')) keywords.push('flower', 'elderflower', 'st germain');
        if (note.label === 'Violet') keywords.push('flower', 'creme de violette');
        if (note.label === 'Mint') keywords.push('peppermint', 'spearmint', 'menthol');
        if (note.label === 'Basil') keywords.push('fresh', 'anise');
        if (note.label === 'Thyme') keywords.push('fresh', 'herbes');
        if (note.label === 'Sage') keywords.push('fresh');
        
        if (note.label === 'Celery') keywords.push('vegetal');
        if (note.label.includes('Cucmbr')) keywords.push('vegetal', 'cucumber');
        if (note.label === 'Tomato') keywords.push('vegetal', 'bloody mary');
        if (note.label === 'Grass') keywords.push('vegetal', 'green');
        if (note.label === 'Amaro') keywords.push('bitter', 'digestif');
        if (note.label === 'Gentian') keywords.push('bitter', 'suze');
        if (note.label.includes('Wrmwood')) keywords.push('bitter', 'wormwood', 'absinthe');
        if (note.label === 'Quinine') keywords.push('bitter', 'tonic');
        
        if (note.label === 'Pepper') keywords.push('heat', 'black pepper');
        if (note.label === 'Chili') keywords.push('heat', 'hot');
        if (note.label === 'Ginger') keywords.push('heat', 'spice');
        if (note.label.includes('Jalapeño')) keywords.push('heat', 'jalapeno');
        if (note.label === 'Nutmeg') keywords.push('warm', 'baking spice');
        if (note.label === 'Clove') keywords.push('warm', 'baking spice');
        if (note.label.includes('Cinnamn')) keywords.push('warm', 'cassia', 'cinnamon');
        if (note.label === 'Allspice') keywords.push('warm', 'pimento');
        
        if (note.label === 'Peat') keywords.push('smoke', 'islay', 'scotch');
        if (note.label.includes('Charcol')) keywords.push('smoke', 'char', 'charcoal');
        if (note.label === 'Smoke') keywords.push('smoked', 'mezcal');
        if (note.label === 'Tobacco') keywords.push('smoke', 'cigar');
        if (note.label === 'Pine') keywords.push('wood', 'resin');
        if (note.label === 'Cedar') keywords.push('wood');
        if (note.label === 'Oak') keywords.push('wood', 'barrel');
        if (note.label === 'Leather') keywords.push('wood', 'earthy');
        
        if (note.label === 'Tart') keywords.push('acidic', 'sour');
        if (note.label === 'Tangy') keywords.push('acidic', 'bright');
        if (note.label === 'Sharp') keywords.push('acidic', 'bright');
        if (note.label === 'Vinegar') keywords.push('fermented', 'acetic');
        if (note.label === 'Wine') keywords.push('fermented', 'vermouth');
        if (note.label === 'Shrub') keywords.push('fermented', 'drinking vinegar');
        
        if (note.label === 'Whiskey') keywords.push('bourbon', 'rye', 'scotch', 'irish');
        if (note.label === 'Brandy') keywords.push('cognac', 'armagnac');
        if (note.label === 'Rum') keywords.push('rhum', 'cachaca');
        if (note.label === 'Tequila') keywords.push('agave', 'reposado', 'anejo');
        if (note.label === 'Gin') keywords.push('juniper', 'botanical');
        if (note.label === 'Vodka') keywords.push('neutral', 'spirit');
        if (note.label === 'Mezcal') keywords.push('agave', 'smoke');
        if (note.label === 'Pisco') keywords.push('grape', 'brandy');
        
        notes.push({
          id: note.id,
          categoryId: category.id,
          label: note.label,
          sortOrder: noteOrder++,
          keywords,
          description: `${subcategory.label} subcategory of ${category.label}`
        });
      }
    }
  }
  
  return notes;
}

const FLAVOR_NOTES = generateFlavorNotes();

function generateFlavorSubcategories() {
  const subcategories: Array<{
    id: string;
    categoryId: string;
    label: string;
    sortOrder: number;
    description: string;
  }> = [];
  
  for (const category of FLAVOR_TAXONOMY) {
    let subOrder = 0;
    for (const subcategory of category.subcategories) {
      subcategories.push({
        id: subcategory.id,
        categoryId: category.id,
        label: subcategory.label,
        sortOrder: subOrder++,
        description: `${subcategory.label} flavors within ${category.label}`
      });
    }
  }
  
  return subcategories;
}

const FLAVOR_SUBCATEGORIES = generateFlavorSubcategories();

export async function seedFlavorData(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Seeding NEW 3-tier flavor taxonomy...');
    
    await db.delete(ingredientFlavorMappings);
    await db.delete(flavorNotes);
    await db.delete(flavorSubcategories);
    await db.delete(flavorCategories);
    
    console.log('Seeding flavor categories...');
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
    
    console.log('Seeding flavor subcategories...');
    for (const subcategory of FLAVOR_SUBCATEGORIES) {
      await db.insert(flavorSubcategories).values(subcategory).onConflictDoUpdate({
        target: flavorSubcategories.id,
        set: {
          categoryId: subcategory.categoryId,
          label: subcategory.label,
          sortOrder: subcategory.sortOrder,
          description: subcategory.description,
          updatedAt: new Date()
        }
      });
    }
    console.log(`Seeded ${FLAVOR_SUBCATEGORIES.length} flavor subcategories`);
    
    console.log('Seeding flavor notes (3-tier structure)...');
    for (const note of FLAVOR_NOTES) {
      const subcategoryId = note.id.split('.').slice(0, 2).join('.');
      await db.insert(flavorNotes).values({
        ...note,
        subcategoryId
      }).onConflictDoUpdate({
        target: flavorNotes.id,
        set: {
          categoryId: note.categoryId,
          subcategoryId,
          label: note.label,
          sortOrder: note.sortOrder,
          keywords: note.keywords,
          description: note.description,
          updatedAt: new Date()
        }
      });
    }
    console.log(`Seeded ${FLAVOR_NOTES.length} flavor notes`);
    
    console.log('Seeding ingredient-flavor mappings from taxonomy...');
    let mappingCount = 0;
    for (const [ingredient, noteIds] of Object.entries(TAXONOMY_INGREDIENT_MAP)) {
      for (let i = 0; i < noteIds.length; i++) {
        try {
          await db.insert(ingredientFlavorMappings).values({
            ingredientKeyword: ingredient,
            noteId: noteIds[i],
            intensity: i === 0 ? 8 : 5,
            isPrimary: i === 0,
            source: 'taxonomy'
          });
          mappingCount++;
        } catch (e) {
        }
      }
    }
    console.log(`Seeded ${mappingCount} ingredient-flavor mappings`);
    
    await db.insert(flavorDataVersion).values({
      version: '2.0.0',
      description: '3-tier flavor taxonomy: 8 categories (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy) with subcategories and notes'
    });
    
    console.log('Flavor data seeding complete!');
    return { 
      success: true, 
      message: `Seeded ${FLAVOR_CATEGORIES.length} categories, ${FLAVOR_NOTES.length} notes, ${mappingCount} mappings (3-tier taxonomy v2.0.0)` 
    };
  } catch (error) {
    console.error('Error seeding flavor data:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function migrateProfile(profile: Record<string, number> | null): Record<string, number> | null {
  if (!profile) return null;
  
  const hasLegacyFields = 'Bitter' in profile || 'Smoky' in profile;
  const hasNewFloral = 'Floral' in profile && profile.Floral > 0;
  const hasNewEarthy = 'Earthy' in profile && profile.Earthy > 0;
  
  if (!hasLegacyFields && hasNewFloral && hasNewEarthy) {
    return profile;
  }
  
  const bitterValue = (profile as any).Bitter ?? 0;
  const smokyValue = (profile as any).Smoky ?? 0;
  
  const newProfile: Record<string, number> = {
    Sweet: profile.Sweet ?? 0,
    Fruity: profile.Fruity ?? 0,
    Floral: hasNewFloral ? profile.Floral : 0,
    Herbal: hasNewFloral ? (profile.Herbal ?? 0) : Math.max(profile.Herbal ?? 0, bitterValue),
    Spicy: profile.Spicy ?? 0,
    Earthy: hasNewEarthy ? profile.Earthy : Math.max(profile.Earthy ?? 0, smokyValue),
    Sour: profile.Sour ?? 0,
    Boozy: profile.Boozy ?? 0,
  };
  
  return newProfile;
}

export async function migrateToSubcategories(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Migrating to 3-tier structure with subcategories...');
    
    const existingSubcats = await db.select().from(flavorSubcategories);
    if (existingSubcats.length > 0) {
      console.log('Subcategories already exist, checking for note updates...');
    } else {
      console.log('Seeding subcategories...');
      for (const subcategory of FLAVOR_SUBCATEGORIES) {
        await db.insert(flavorSubcategories).values(subcategory).onConflictDoNothing();
      }
      console.log(`Seeded ${FLAVOR_SUBCATEGORIES.length} subcategories`);
    }
    
    const existingNotes = await db.select().from(flavorNotes);
    let updatedCount = 0;
    
    for (const note of existingNotes) {
      if (!note.subcategoryId) {
        const parts = note.id.split('.');
        if (parts.length >= 2) {
          const subcategoryId = `${parts[0]}.${parts[1]}`;
          await db.update(flavorNotes)
            .set({ subcategoryId, updatedAt: new Date() })
            .where(eq(flavorNotes.id, note.id));
          updatedCount++;
        }
      }
    }
    console.log(`Updated ${updatedCount} notes with subcategory references`);
    
    await db.insert(flavorDataVersion).values({
      version: '2.1.0',
      description: 'Migration to 3-tier structure with subcategories'
    });
    
    return { 
      success: true, 
      message: `Migrated to 3-tier structure: ${FLAVOR_SUBCATEGORIES.length} subcategories, ${updatedCount} notes updated` 
    };
  } catch (error) {
    console.error('Error migrating to subcategories:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function migrateLegacyProfiles(): Promise<{ 
  success: boolean; 
  globalMigrated: number; 
  userMigrated: number; 
  labRiffsMigrated: number;
  message: string 
}> {
  let globalMigrated = 0;
  let userMigrated = 0;
  let labRiffsMigrated = 0;
  
  try {
    console.log('Migrating legacy flavor profiles (Bitter/Smoky -> Herbal/Earthy)...');
    
    const allGlobal = await db.select().from(globalRecipes);
    for (const recipe of allGlobal) {
      const profile = recipe.flavorProfile as Record<string, number> | null;
      if (!profile) continue;
      
      const hasLegacy = 'Bitter' in profile || 'Smoky' in profile;
      const needsMigration = hasLegacy || !('Floral' in profile) || !('Earthy' in profile);
      
      if (needsMigration) {
        const newProfile = migrateProfile(profile);
        if (newProfile) {
          await db.update(globalRecipes)
            .set({ flavorProfile: newProfile, updatedAt: new Date() })
            .where(eq(globalRecipes.id, recipe.id));
          globalMigrated++;
        }
      }
    }
    console.log(`Migrated ${globalMigrated} global recipes`);
    
    const allUser = await db.select().from(userRecipes);
    for (const recipe of allUser) {
      const profile = recipe.flavorProfile as Record<string, number> | null;
      if (!profile) continue;
      
      const hasLegacy = 'Bitter' in profile || 'Smoky' in profile;
      const needsMigration = hasLegacy || !('Floral' in profile) || !('Earthy' in profile);
      
      if (needsMigration) {
        const newProfile = migrateProfile(profile);
        if (newProfile) {
          await db.update(userRecipes)
            .set({ flavorProfile: newProfile, updatedAt: new Date() })
            .where(eq(userRecipes.id, recipe.id));
          userMigrated++;
        }
      }
    }
    console.log(`Migrated ${userMigrated} user recipes`);
    
    const allLabRiffs = await db.select().from(labRiffs);
    for (const riff of allLabRiffs) {
      const profile = riff.predictedFlavorProfile as Record<string, number> | null;
      if (!profile) continue;
      
      const hasLegacy = 'Bitter' in profile || 'Smoky' in profile;
      const needsMigration = hasLegacy || !('Floral' in profile) || !('Earthy' in profile);
      
      if (needsMigration) {
        const newProfile = migrateProfile(profile);
        if (newProfile) {
          await db.update(labRiffs)
            .set({ predictedFlavorProfile: newProfile, updatedAt: new Date() })
            .where(eq(labRiffs.id, riff.id));
          labRiffsMigrated++;
        }
      }
    }
    console.log(`Migrated ${labRiffsMigrated} lab riffs`);
    
    return {
      success: true,
      globalMigrated,
      userMigrated,
      labRiffsMigrated,
      message: `Migrated ${globalMigrated} global, ${userMigrated} user recipes, and ${labRiffsMigrated} lab riffs to new flavor taxonomy`
    };
  } catch (error) {
    console.error('Error migrating profiles:', error);
    return {
      success: false,
      globalMigrated,
      userMigrated,
      labRiffsMigrated,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function reenrichAllRecipes(batchSize: number = 5): Promise<{
  success: boolean;
  markedForReenrichment: number;
  message: string;
}> {
  try {
    console.log('Marking all recipes for re-enrichment with new taxonomy...');
    
    const result = await db.update(globalRecipes)
      .set({ 
        enrichmentStatus: 'pending',
        updatedAt: new Date()
      });
    
    const allRecipes = await db.select().from(globalRecipes);
    
    return {
      success: true,
      markedForReenrichment: allRecipes.length,
      message: `Marked ${allRecipes.length} recipes for re-enrichment. Run /api/admin/enrich-recipes to process.`
    };
  } catch (error) {
    console.error('Error marking recipes for re-enrichment:', error);
    return {
      success: false,
      markedForReenrichment: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FlavorCategory {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  description?: string;
}

export interface FlavorNote {
  id: string;
  categoryId: string;
  label: string;
  sortOrder: number;
  keywords: string[];
}

export interface FlavorTaxonomy {
  categories: FlavorCategory[];
  notes: FlavorNote[];
  notesByCategory: Record<string, FlavorNote[]>;
  version: string;
}

export interface DerivedFlavorResult {
  matchedNotes: string[];
  categoryIntensities: Record<string, number>;
  derivedCategories: string[];
  unmatchedIngredients: string[];
}

async function fetchFlavorTaxonomy(): Promise<FlavorTaxonomy> {
  const response = await fetch('/api/flavor-taxonomy');
  if (!response.ok) {
    throw new Error('Failed to fetch flavor taxonomy');
  }
  return response.json();
}

async function deriveFlavorsFromIngredients(ingredients: string[]): Promise<DerivedFlavorResult> {
  const response = await fetch('/api/flavor-taxonomy/derive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients }),
  });
  if (!response.ok) {
    throw new Error('Failed to derive flavors');
  }
  return response.json();
}

export function useFlavorTaxonomy() {
  return useQuery<FlavorTaxonomy>({
    queryKey: ['flavorTaxonomy'],
    queryFn: fetchFlavorTaxonomy,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

export function useDeriveFlavorNotes() {
  return useMutation({
    mutationFn: deriveFlavorsFromIngredients,
  });
}

export function useFlavorNotesForIngredients(ingredients: string[] | undefined, enabled = true) {
  return useQuery<DerivedFlavorResult>({
    queryKey: ['derivedFlavors', ingredients?.join(',') ?? ''],
    queryFn: () => deriveFlavorsFromIngredients(ingredients!),
    enabled: enabled && !!ingredients && ingredients.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

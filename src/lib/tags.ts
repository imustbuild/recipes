/**
 * Tag Management
 * 
 * Handles tag aggregation and canonical tag list
 */

import type { NormalizedRecipe, TagCount, TagsIndex } from '@/types/recipe';

/**
 * Canonical tag categories for organization
 * Tags not in this list are considered "uncategorized"
 */
export const CANONICAL_TAGS = {
  meal: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer', 'side'],
  cuisine: ['italian', 'mexican', 'asian', 'indian', 'mediterranean', 'american', 'french', 'thai', 'japanese', 'chinese'],
  diet: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb'],
  method: ['baked', 'grilled', 'fried', 'slow-cooker', 'instant-pot', 'no-cook', 'one-pot'],
  time: ['quick', '30-minutes', 'weeknight', 'meal-prep', 'make-ahead'],
  season: ['spring', 'summer', 'fall', 'winter', 'holiday'],
} as const;

/**
 * Get all canonical tags as a flat array
 */
export function getAllCanonicalTags(): string[] {
  return Object.values(CANONICAL_TAGS).flat();
}

/**
 * Check if a tag is canonical
 */
export function isCanonicalTag(tag: string): boolean {
  return getAllCanonicalTags().includes(tag.toLowerCase());
}

/**
 * Get the category of a canonical tag
 */
export function getTagCategory(tag: string): string | null {
  const normalizedTag = tag.toLowerCase();
  
  for (const [category, tags] of Object.entries(CANONICAL_TAGS)) {
    if ((tags as readonly string[]).includes(normalizedTag)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Aggregate tags from recipes with categorization
 */
export interface CategorizedTags {
  categorized: Record<string, TagCount[]>;
  uncategorized: TagCount[];
}

export function categorizeTags(tagsIndex: TagsIndex): CategorizedTags {
  const categorized: Record<string, TagCount[]> = {};
  const uncategorized: TagCount[] = [];
  
  // Initialize categories
  for (const category of Object.keys(CANONICAL_TAGS)) {
    categorized[category] = [];
  }
  
  // Sort tags into categories
  for (const tagCount of tagsIndex.tags) {
    const category = getTagCategory(tagCount.tag);
    
    if (category) {
      categorized[category].push(tagCount);
    } else {
      uncategorized.push(tagCount);
    }
  }
  
  return { categorized, uncategorized };
}

/**
 * Suggest tags based on recipe content
 */
export function suggestTags(recipe: { title: string; description: string; ingredients: { item: string }[] }): string[] {
  const text = [
    recipe.title,
    recipe.description,
    ...recipe.ingredients.map(i => i.item),
  ].join(' ').toLowerCase();
  
  const suggestions: string[] = [];
  const allTags = getAllCanonicalTags();
  
  for (const tag of allTags) {
    if (text.includes(tag)) {
      suggestions.push(tag);
    }
  }
  
  return suggestions;
}


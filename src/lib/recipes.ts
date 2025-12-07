/**
 * Recipe Loading and Management
 * 
 * Loads recipes from content/recipes/<slug>/index.md
 * Parses YAML frontmatter and normalizes data
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { RawRecipe, NormalizedRecipe, RecipeResponse, TagCount, TagsIndex } from '@/types/recipe';
import { normalizeRecipe } from './normalize';

// Path to recipes content directory
const RECIPES_DIR = path.join(process.cwd(), 'content', 'recipes');

/**
 * Get all recipe slugs (folder names)
 */
export function getRecipeSlugs(): string[] {
  if (!fs.existsSync(RECIPES_DIR)) {
    return [];
  }
  
  return fs.readdirSync(RECIPES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

/**
 * Load a single recipe by slug
 */
export function loadRecipe(slug: string): NormalizedRecipe | null {
  const recipePath = path.join(RECIPES_DIR, slug, 'index.md');
  
  if (!fs.existsSync(recipePath)) {
    return null;
  }
  
  const fileContent = fs.readFileSync(recipePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  // Construct raw recipe from frontmatter + body
  const raw: RawRecipe = {
    ...data,
    slug,
    body: content.trim(),
  } as RawRecipe;
  
  return normalizeRecipe(raw);
}

/**
 * Load all recipes
 */
export function loadAllRecipes(): NormalizedRecipe[] {
  const slugs = getRecipeSlugs();
  
  return slugs
    .map(slug => loadRecipe(slug))
    .filter((recipe): recipe is NormalizedRecipe => recipe !== null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)); // Most recent first
}

/**
 * Convert normalized recipe to API response format
 */
export function toRecipeResponse(recipe: NormalizedRecipe): RecipeResponse {
  return {
    ...recipe,
    url: `/recipes/${recipe.slug}`,
  };
}

/**
 * Search recipes by query string
 * Searches title, description, tags, and ingredients
 */
export function searchRecipes(recipes: NormalizedRecipe[], query: string): NormalizedRecipe[] {
  const q = query.toLowerCase().trim();
  
  if (!q) {
    return recipes;
  }
  
  return recipes.filter(recipe => {
    // Search in title
    if (recipe.title.toLowerCase().includes(q)) return true;
    
    // Search in description
    if (recipe.description.toLowerCase().includes(q)) return true;
    
    // Search in tags
    if (recipe.tags.some(tag => tag.toLowerCase().includes(q))) return true;
    
    // Search in ingredients
    if (recipe.ingredients.some(ing => ing.item.toLowerCase().includes(q))) return true;
    
    return false;
  });
}

/**
 * Filter recipes by tag
 */
export function filterByTag(recipes: NormalizedRecipe[], tag: string): NormalizedRecipe[] {
  const t = tag.toLowerCase();
  return recipes.filter(recipe => 
    recipe.tags.some(recipeTag => recipeTag.toLowerCase() === t)
  );
}

/**
 * Get all unique tags with counts
 */
export function getTagsIndex(recipes: NormalizedRecipe[]): TagsIndex {
  const tagCounts = new Map<string, number>();
  
  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      const normalizedTag = tag.toLowerCase();
      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
    }
  }
  
  const tags: TagCount[] = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count); // Most used first
  
  return {
    tags,
    total: tags.length,
  };
}

/**
 * Get featured recipes (most recent with images or most tags)
 */
export function getFeaturedRecipes(recipes: NormalizedRecipe[], limit = 3): NormalizedRecipe[] {
  // For now, just return the most recent recipes
  return recipes.slice(0, limit);
}


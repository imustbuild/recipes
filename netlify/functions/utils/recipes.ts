/**
 * Recipe utilities for Netlify Functions
 * Server-side recipe loading that works in Netlify Functions context
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Types (duplicated to avoid import issues in functions)
export interface Ingredient {
  item: string;
  amount?: string;
  note?: string;
}

export interface RecipeTimes {
  prep_minutes?: number;
  cook_minutes?: number;
  total_minutes?: number;
}

export interface NormalizedTimes {
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
}

export interface RawRecipe {
  title: string;
  slug: string;
  description?: string;
  servings?: number;
  source_url?: string;
  tags?: string[];
  times?: RecipeTimes;
  ingredients?: Ingredient[];
  instructions?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  body?: string;
}

export interface NormalizedRecipe {
  title: string;
  slug: string;
  description: string;
  servings: number;
  source_url: string;
  tags: string[];
  times: NormalizedTimes;
  ingredients: Ingredient[];
  instructions: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  body: string;
}

export interface RecipeInput {
  title: string;
  slug?: string;
  description?: string;
  servings?: number;
  source_url?: string;
  tags?: string[];
  times?: RecipeTimes;
  ingredients?: Ingredient[];
  instructions?: string[];
  notes?: string;
  body?: string;
}

/**
 * Normalize times
 */
function normalizeTimes(times?: RecipeTimes): NormalizedTimes {
  const prep = times?.prep_minutes ?? 0;
  const cook = times?.cook_minutes ?? 0;
  const total = times?.total_minutes ?? (prep + cook);
  
  return { prep_minutes: prep, cook_minutes: cook, total_minutes: total };
}

/**
 * Get today's date as ISO string
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize a raw recipe
 */
export function normalizeRecipe(raw: RawRecipe): NormalizedRecipe {
  const now = today();
  
  return {
    title: raw.title,
    slug: raw.slug,
    description: raw.description ?? '',
    servings: raw.servings ?? 4,
    source_url: raw.source_url ?? '',
    tags: raw.tags ?? [],
    times: normalizeTimes(raw.times),
    ingredients: raw.ingredients ?? [],
    instructions: raw.instructions ?? [],
    notes: raw.notes ?? '',
    created_at: raw.created_at ?? now,
    updated_at: raw.updated_at ?? now,
    body: raw.body ?? '',
  };
}

/**
 * Generate slug from title
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert recipe to markdown with YAML frontmatter
 */
export function recipeToMarkdown(recipe: NormalizedRecipe): string {
  const frontmatter: Record<string, unknown> = {
    title: recipe.title,
  };
  
  if (recipe.description) frontmatter.description = recipe.description;
  if (recipe.servings !== 4) frontmatter.servings = recipe.servings;
  if (recipe.source_url) frontmatter.source_url = recipe.source_url;
  if (recipe.tags.length > 0) frontmatter.tags = recipe.tags;
  
  if (recipe.times.prep_minutes || recipe.times.cook_minutes || recipe.times.total_minutes) {
    frontmatter.times = {};
    if (recipe.times.prep_minutes) (frontmatter.times as Record<string, number>).prep_minutes = recipe.times.prep_minutes;
    if (recipe.times.cook_minutes) (frontmatter.times as Record<string, number>).cook_minutes = recipe.times.cook_minutes;
    if (recipe.times.total_minutes !== recipe.times.prep_minutes + recipe.times.cook_minutes) {
      (frontmatter.times as Record<string, number>).total_minutes = recipe.times.total_minutes;
    }
  }
  
  if (recipe.ingredients.length > 0) frontmatter.ingredients = recipe.ingredients;
  if (recipe.instructions.length > 0) frontmatter.instructions = recipe.instructions;
  if (recipe.notes) frontmatter.notes = recipe.notes;
  
  frontmatter.created_at = recipe.created_at;
  frontmatter.updated_at = recipe.updated_at;
  
  const yaml = matter.stringify(recipe.body || '', frontmatter);
  return yaml;
}

// Path to recipes (relative to function execution)
const RECIPES_DIR = path.join(process.cwd(), 'content', 'recipes');

/**
 * Get all recipe slugs
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
 * Load a recipe by slug
 */
export function loadRecipe(slug: string): NormalizedRecipe | null {
  const recipePath = path.join(RECIPES_DIR, slug, 'index.md');
  
  if (!fs.existsSync(recipePath)) {
    return null;
  }
  
  const fileContent = fs.readFileSync(recipePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
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
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/**
 * Search recipes
 */
export function searchRecipes(recipes: NormalizedRecipe[], query: string): NormalizedRecipe[] {
  const q = query.toLowerCase().trim();
  
  if (!q) return recipes;
  
  return recipes.filter(recipe => {
    if (recipe.title.toLowerCase().includes(q)) return true;
    if (recipe.description.toLowerCase().includes(q)) return true;
    if (recipe.tags.some(tag => tag.toLowerCase().includes(q))) return true;
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
 * Get tags index
 */
export function getTagsIndex(recipes: NormalizedRecipe[]): { tags: { tag: string; count: number }[]; total: number } {
  const tagCounts = new Map<string, number>();
  
  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      const normalizedTag = tag.toLowerCase();
      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
    }
  }
  
  const tags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  
  return { tags, total: tags.length };
}


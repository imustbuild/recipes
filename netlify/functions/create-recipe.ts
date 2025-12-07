/**
 * POST /api/create-recipe
 * 
 * Create a new recipe (requires authentication)
 * 
 * Body: RecipeInput
 */

import type { Context } from '@netlify/functions';
import { isAuthenticated, unauthorizedResponse, jsonResponse, errorResponse } from './utils/auth';
import { normalizeRecipe, slugify, recipeToMarkdown, loadRecipe, type RecipeInput, type RawRecipe } from './utils/recipes';

export default async function handler(request: Request, context: Context) {
  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }
  
  // Check authentication
  if (!isAuthenticated(request, context)) {
    return unauthorizedResponse();
  }
  
  let input: RecipeInput;
  
  try {
    input = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  // Validate required fields
  if (!input.title || typeof input.title !== 'string') {
    return errorResponse('Title is required');
  }
  
  // Generate slug if not provided
  const slug = input.slug || slugify(input.title);
  
  // Check if recipe already exists
  if (loadRecipe(slug)) {
    return errorResponse(`Recipe with slug "${slug}" already exists`, 409);
  }
  
  // Build raw recipe
  const now = new Date().toISOString().split('T')[0];
  const raw: RawRecipe = {
    title: input.title,
    slug,
    description: input.description,
    servings: input.servings,
    source_url: input.source_url,
    tags: input.tags,
    times: input.times,
    ingredients: input.ingredients,
    instructions: input.instructions,
    notes: input.notes,
    created_at: now,
    updated_at: now,
    body: input.body,
  };
  
  // Normalize
  const recipe = normalizeRecipe(raw);
  
  // Generate markdown content
  const markdown = recipeToMarkdown(recipe);
  
  // Return the recipe data and file info for commit
  // The actual commit is handled separately via commit-recipes
  return jsonResponse({
    recipe: {
      ...recipe,
      url: `/recipes/${recipe.slug}`,
    },
    file: {
      path: `content/recipes/${slug}/index.md`,
      content: markdown,
    },
    message: `Add recipe: ${recipe.title}`,
  }, 201);
}


/**
 * PUT /api/update-recipe
 * 
 * Update an existing recipe (requires authentication)
 * 
 * Body: { slug: string, updates: Partial<RecipeInput> }
 */

import type { Context } from '@netlify/functions';
import { isAuthenticated, unauthorizedResponse, jsonResponse, errorResponse } from './utils/auth';
import { normalizeRecipe, recipeToMarkdown, loadRecipe, type RecipeInput, type RawRecipe } from './utils/recipes';

interface UpdateBody {
  slug: string;
  updates: Partial<RecipeInput>;
}

export default async function handler(request: Request, context: Context) {
  // Only allow PUT
  if (request.method !== 'PUT') {
    return errorResponse('Method not allowed', 405);
  }
  
  // Check authentication
  if (!isAuthenticated(request, context)) {
    return unauthorizedResponse();
  }
  
  let body: UpdateBody;
  
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  const { slug, updates } = body;
  
  if (!slug) {
    return errorResponse('Slug is required');
  }
  
  // Load existing recipe
  const existing = loadRecipe(slug);
  
  if (!existing) {
    return errorResponse(`Recipe "${slug}" not found`, 404);
  }
  
  // Merge updates
  const now = new Date().toISOString().split('T')[0];
  const raw: RawRecipe = {
    title: updates.title ?? existing.title,
    slug: existing.slug, // Slug cannot be changed
    description: updates.description ?? existing.description,
    servings: updates.servings ?? existing.servings,
    source_url: updates.source_url ?? existing.source_url,
    tags: updates.tags ?? existing.tags,
    times: updates.times ?? existing.times,
    ingredients: updates.ingredients ?? existing.ingredients,
    instructions: updates.instructions ?? existing.instructions,
    notes: updates.notes ?? existing.notes,
    created_at: existing.created_at,
    updated_at: now, // Always update timestamp
    body: updates.body ?? existing.body,
  };
  
  // Normalize
  const recipe = normalizeRecipe(raw);
  
  // Generate markdown content
  const markdown = recipeToMarkdown(recipe);
  
  return jsonResponse({
    recipe: {
      ...recipe,
      url: `/recipes/${recipe.slug}`,
    },
    file: {
      path: `content/recipes/${slug}/index.md`,
      content: markdown,
    },
    message: `Update recipe: ${recipe.title}`,
  });
}


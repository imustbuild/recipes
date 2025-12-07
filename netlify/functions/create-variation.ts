/**
 * POST /api/create-variation
 * 
 * Create a variation of an existing recipe (requires authentication)
 * 
 * Body: { source_slug: string, new_title: string, new_slug?: string, modifications: Partial<RecipeInput> }
 */

import type { Context } from '@netlify/functions';
import { isAuthenticated, unauthorizedResponse, jsonResponse, errorResponse } from './utils/auth';
import { normalizeRecipe, slugify, recipeToMarkdown, loadRecipe, type RecipeInput, type RawRecipe } from './utils/recipes';

interface VariationBody {
  source_slug: string;
  new_title: string;
  new_slug?: string;
  modifications?: Partial<RecipeInput>;
}

export default async function handler(request: Request, context: Context) {
  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }
  
  // Check authentication
  if (!isAuthenticated(request, context)) {
    return unauthorizedResponse();
  }
  
  let body: VariationBody;
  
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  const { source_slug, new_title, new_slug, modifications = {} } = body;
  
  if (!source_slug) {
    return errorResponse('source_slug is required');
  }
  
  if (!new_title) {
    return errorResponse('new_title is required');
  }
  
  // Load source recipe
  const source = loadRecipe(source_slug);
  
  if (!source) {
    return errorResponse(`Source recipe "${source_slug}" not found`, 404);
  }
  
  // Generate new slug
  const slug = new_slug || slugify(new_title);
  
  // Check if new recipe already exists
  if (loadRecipe(slug)) {
    return errorResponse(`Recipe with slug "${slug}" already exists`, 409);
  }
  
  // Create variation by merging source with modifications
  const now = new Date().toISOString().split('T')[0];
  const raw: RawRecipe = {
    title: new_title,
    slug,
    description: modifications.description ?? source.description,
    servings: modifications.servings ?? source.servings,
    source_url: modifications.source_url ?? source.source_url,
    tags: modifications.tags ?? source.tags,
    times: modifications.times ?? source.times,
    ingredients: modifications.ingredients ?? source.ingredients,
    instructions: modifications.instructions ?? source.instructions,
    notes: modifications.notes ?? `Variation of ${source.title}. ${source.notes}`.trim(),
    created_at: now,
    updated_at: now,
    body: modifications.body ?? source.body,
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
    source: {
      slug: source.slug,
      title: source.title,
    },
    file: {
      path: `content/recipes/${slug}/index.md`,
      content: markdown,
    },
    message: `Add variation: ${recipe.title} (based on ${source.title})`,
  }, 201);
}


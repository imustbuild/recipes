/**
 * GET /api/get-recipe?slug=<slug>
 * 
 * Fetch a single recipe by slug
 */

import type { Context } from '@netlify/functions';
import { loadRecipe } from './utils/recipes';
import { jsonResponse, errorResponse } from './utils/auth';

export default async function handler(request: Request, context: Context) {
  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }
  
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  
  if (!slug) {
    return errorResponse('Missing slug parameter');
  }
  
  const recipe = loadRecipe(slug);
  
  if (!recipe) {
    return errorResponse('Recipe not found', 404);
  }
  
  return jsonResponse({
    ...recipe,
    url: `/recipes/${recipe.slug}`,
  });
}


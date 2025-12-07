/**
 * GET /api/search-recipes?q=<query>&tag=<tag>&limit=<limit>
 * 
 * Search and filter recipes
 */

import type { Context } from '@netlify/functions';
import { loadAllRecipes, searchRecipes, filterByTag, getTagsIndex } from './utils/recipes';
import { jsonResponse, errorResponse } from './utils/auth';

export default async function handler(request: Request, context: Context) {
  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }
  
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  
  let recipes = loadAllRecipes();
  
  // Apply search filter
  if (query) {
    recipes = searchRecipes(recipes, query);
  }
  
  // Apply tag filter
  if (tag) {
    recipes = filterByTag(recipes, tag);
  }
  
  // Apply limit
  if (limit && limit > 0) {
    recipes = recipes.slice(0, limit);
  }
  
  // Add URLs
  const results = recipes.map(recipe => ({
    ...recipe,
    url: `/recipes/${recipe.slug}`,
  }));
  
  return jsonResponse({
    recipes: results,
    total: results.length,
    query: query || undefined,
    tag: tag || undefined,
  });
}


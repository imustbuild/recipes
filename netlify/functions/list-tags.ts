/**
 * GET /api/list-tags
 * 
 * Get all tags with counts
 */

import type { Context } from '@netlify/functions';
import { loadAllRecipes, getTagsIndex } from './utils/recipes';
import { jsonResponse, errorResponse } from './utils/auth';

export default async function handler(request: Request, context: Context) {
  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }
  
  const recipes = loadAllRecipes();
  const tagsIndex = getTagsIndex(recipes);
  
  return jsonResponse(tagsIndex);
}


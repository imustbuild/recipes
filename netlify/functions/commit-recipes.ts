/**
 * POST /api/commit-recipes
 * 
 * Commit recipe files to git (requires authentication)
 * 
 * Body: { files: Array<{ path: string, content: string }>, message: string }
 */

import type { Context } from '@netlify/functions';
import { isAuthenticated, unauthorizedResponse, jsonResponse, errorResponse } from './utils/auth';
import { commitFiles, isGitHubConfigured } from './utils/github';

interface CommitBody {
  files: Array<{
    path: string;
    content: string;
  }>;
  message: string;
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
  
  // Check GitHub configuration
  if (!isGitHubConfigured()) {
    return errorResponse('GitHub not configured. Required env vars: GIT_REPO_OWNER, GIT_REPO_NAME, GIT_PAT', 500);
  }
  
  let body: CommitBody;
  
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  const { files, message } = body;
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    return errorResponse('files array is required and must not be empty');
  }
  
  if (!message || typeof message !== 'string') {
    return errorResponse('message is required');
  }
  
  // Validate all files have required fields
  for (const file of files) {
    if (!file.path || !file.content) {
      return errorResponse('Each file must have path and content');
    }
  }
  
  try {
    const result = await commitFiles(files, message);
    
    return jsonResponse({
      success: true,
      commit: {
        sha: result.commit.sha,
        url: result.commit.html_url,
      },
      files: result.files,
      message,
    });
  } catch (error) {
    console.error('Commit failed:', error);
    return errorResponse(
      `Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}


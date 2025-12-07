/**
 * Authentication utilities for Netlify Functions
 */

import type { Context } from '@netlify/functions';

/**
 * Validate bearer token from Authorization header
 */
export function validateBearerToken(headers: Headers): boolean {
  const authHeader = headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.slice(7);
  const expectedToken = process.env.RECIPE_AGENT_API_TOKEN;
  
  if (!expectedToken) {
    console.error('RECIPE_AGENT_API_TOKEN not configured');
    return false;
  }
  
  return token === expectedToken;
}

/**
 * Validate Netlify Identity user from context
 */
export function validateNetlifyIdentity(context: Context): boolean {
  // Netlify Identity JWT is automatically validated and parsed
  // @ts-ignore - clientContext may not be typed
  const user = context.clientContext?.identity?.user;
  return !!user;
}

/**
 * Check if request is authenticated (either method)
 */
export function isAuthenticated(request: Request, context: Context): boolean {
  return validateBearerToken(request.headers) || validateNetlifyIdentity(context);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create JSON response
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create error response
 */
export function errorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}


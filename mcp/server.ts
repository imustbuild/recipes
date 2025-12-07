#!/usr/bin/env node
/**
 * Recipe Platform MCP Server
 * 
 * Local stdio MCP server that calls the Netlify API
 * 
 * Tools:
 * - search_recipes: Search recipes by query or tag
 * - get_recipe: Get a single recipe by slug
 * - create_recipe: Create a new recipe
 * - update_recipe: Update an existing recipe
 * - create_variation: Create a variation of a recipe
 * - import_recipe_from_url: Import a recipe from a URL (stub)
 * - list_tags: Get all tags with counts
 * - commit_changes: Commit pending recipe changes to git
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.RECIPE_API_BASE_URL || 'http://localhost:8888/api';
const API_TOKEN = process.env.RECIPE_API_TOKEN || '';

// Helper to make authenticated API calls
async function apiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: unknown
): Promise<unknown> {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }
  
  return response.json();
}

// Tool schemas
const SearchRecipesSchema = z.object({
  query: z.string().optional().describe('Search query'),
  tag: z.string().optional().describe('Filter by tag'),
  limit: z.number().optional().describe('Maximum results to return'),
});

const GetRecipeSchema = z.object({
  slug: z.string().describe('Recipe slug'),
});

const CreateRecipeSchema = z.object({
  title: z.string().describe('Recipe title'),
  description: z.string().optional().describe('Short description'),
  servings: z.number().optional().describe('Number of servings'),
  source_url: z.string().optional().describe('Original recipe URL'),
  tags: z.array(z.string()).optional().describe('Recipe tags'),
  prep_minutes: z.number().optional().describe('Prep time in minutes'),
  cook_minutes: z.number().optional().describe('Cook time in minutes'),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string().optional(),
    note: z.string().optional(),
  })).optional().describe('Ingredients list'),
  instructions: z.array(z.string()).optional().describe('Step-by-step instructions'),
  notes: z.string().optional().describe('Additional notes'),
});

const UpdateRecipeSchema = z.object({
  slug: z.string().describe('Recipe slug to update'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  servings: z.number().optional().describe('Number of servings'),
  tags: z.array(z.string()).optional().describe('Recipe tags'),
  prep_minutes: z.number().optional().describe('Prep time in minutes'),
  cook_minutes: z.number().optional().describe('Cook time in minutes'),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string().optional(),
    note: z.string().optional(),
  })).optional().describe('Ingredients list'),
  instructions: z.array(z.string()).optional().describe('Step-by-step instructions'),
  notes: z.string().optional().describe('Additional notes'),
});

const CreateVariationSchema = z.object({
  source_slug: z.string().describe('Slug of the recipe to base variation on'),
  new_title: z.string().describe('Title for the new variation'),
  description: z.string().optional().describe('Description for variation'),
  tags: z.array(z.string()).optional().describe('Tags for variation'),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string().optional(),
    note: z.string().optional(),
  })).optional().describe('Modified ingredients'),
  instructions: z.array(z.string()).optional().describe('Modified instructions'),
  notes: z.string().optional().describe('Notes about what changed'),
});

const ImportRecipeSchema = z.object({
  url: z.string().describe('URL of the recipe to import'),
});

const CommitChangesSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).describe('Files to commit'),
  message: z.string().describe('Commit message'),
});

// Create server
const server = new Server(
  {
    name: 'recipe-platform',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_recipes',
        description: 'Search recipes by query text or filter by tag. Returns a list of matching recipes.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (searches title, description, ingredients)' },
            tag: { type: 'string', description: 'Filter by specific tag' },
            limit: { type: 'number', description: 'Maximum number of results' },
          },
        },
      },
      {
        name: 'get_recipe',
        description: 'Get full details of a specific recipe by its slug.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Recipe slug (URL-friendly identifier)' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'create_recipe',
        description: 'Create a new recipe. Returns the recipe data and file info for committing.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Recipe title' },
            description: { type: 'string', description: 'Short description' },
            servings: { type: 'number', description: 'Number of servings' },
            source_url: { type: 'string', description: 'Original source URL' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags like "dinner", "vegetarian"' },
            prep_minutes: { type: 'number', description: 'Prep time in minutes' },
            cook_minutes: { type: 'number', description: 'Cook time in minutes' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  amount: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['item'],
              },
              description: 'List of ingredients',
            },
            instructions: { type: 'array', items: { type: 'string' }, description: 'Step-by-step instructions' },
            notes: { type: 'string', description: 'Additional notes or tips' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_recipe',
        description: 'Update an existing recipe. Only provide fields you want to change.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Recipe slug to update' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            servings: { type: 'number', description: 'Number of servings' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
            prep_minutes: { type: 'number', description: 'Prep time in minutes' },
            cook_minutes: { type: 'number', description: 'Cook time in minutes' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  amount: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['item'],
              },
            },
            instructions: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'create_variation',
        description: 'Create a variation of an existing recipe with modifications.',
        inputSchema: {
          type: 'object',
          properties: {
            source_slug: { type: 'string', description: 'Slug of recipe to base variation on' },
            new_title: { type: 'string', description: 'Title for the variation' },
            description: { type: 'string', description: 'Description for variation' },
            tags: { type: 'array', items: { type: 'string' } },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  amount: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['item'],
              },
            },
            instructions: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
          },
          required: ['source_slug', 'new_title'],
        },
      },
      {
        name: 'import_recipe_from_url',
        description: 'Import a recipe from an external URL. (Placeholder - requires scraping implementation)',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the recipe to import' },
          },
          required: ['url'],
        },
      },
      {
        name: 'list_tags',
        description: 'Get all tags used across recipes with their counts.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'commit_changes',
        description: 'Commit pending recipe changes to git. Call this after create/update operations.',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' },
                },
                required: ['path', 'content'],
              },
              description: 'Files to commit',
            },
            message: { type: 'string', description: 'Commit message' },
          },
          required: ['files', 'message'],
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_recipes': {
        const { query, tag, limit } = SearchRecipesSchema.parse(args);
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (tag) params.set('tag', tag);
        if (limit) params.set('limit', String(limit));
        
        const result = await apiCall(`search-recipes?${params}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'get_recipe': {
        const { slug } = GetRecipeSchema.parse(args);
        const result = await apiCall(`get-recipe?slug=${encodeURIComponent(slug)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'create_recipe': {
        const input = CreateRecipeSchema.parse(args);
        const body = {
          title: input.title,
          description: input.description,
          servings: input.servings,
          source_url: input.source_url,
          tags: input.tags,
          times: {
            prep_minutes: input.prep_minutes,
            cook_minutes: input.cook_minutes,
          },
          ingredients: input.ingredients,
          instructions: input.instructions,
          notes: input.notes,
        };
        
        const result = await apiCall('create-recipe', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'update_recipe': {
        const input = UpdateRecipeSchema.parse(args);
        const { slug, ...updates } = input;
        
        const body = {
          slug,
          updates: {
            title: updates.title,
            description: updates.description,
            servings: updates.servings,
            tags: updates.tags,
            times: (updates.prep_minutes || updates.cook_minutes) ? {
              prep_minutes: updates.prep_minutes,
              cook_minutes: updates.cook_minutes,
            } : undefined,
            ingredients: updates.ingredients,
            instructions: updates.instructions,
            notes: updates.notes,
          },
        };
        
        const result = await apiCall('update-recipe', 'PUT', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'create_variation': {
        const input = CreateVariationSchema.parse(args);
        const body = {
          source_slug: input.source_slug,
          new_title: input.new_title,
          modifications: {
            description: input.description,
            tags: input.tags,
            ingredients: input.ingredients,
            instructions: input.instructions,
            notes: input.notes,
          },
        };
        
        const result = await apiCall('create-variation', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'import_recipe_from_url': {
        const { url } = ImportRecipeSchema.parse(args);
        // Placeholder - would need web scraping implementation
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Not implemented',
              message: `Recipe import from URL is not yet implemented. URL: ${url}`,
              suggestion: 'Use create_recipe with manually extracted data instead.',
            }, null, 2),
          }],
        };
      }
      
      case 'list_tags': {
        const result = await apiCall('list-tags');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case 'commit_changes': {
        const { files, message } = CommitChangesSchema.parse(args);
        const result = await apiCall('commit-recipes', 'POST', { files, message });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Recipe Platform MCP Server running on stdio');
}

main().catch(console.error);


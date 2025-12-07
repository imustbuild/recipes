/**
 * Recipe Normalization
 * 
 * Transforms RawRecipe (from YAML) into NormalizedRecipe with:
 * - Default values for missing fields
 * - Calculated totals
 * - Guaranteed arrays
 */

import type { RawRecipe, NormalizedRecipe, NormalizedTimes } from '@/types/recipe';

/**
 * Calculate normalized times from raw times
 */
function normalizeTimes(times?: { prep_minutes?: number; cook_minutes?: number; total_minutes?: number }): NormalizedTimes {
  const prep = times?.prep_minutes ?? 0;
  const cook = times?.cook_minutes ?? 0;
  
  // Use provided total, or calculate from prep + cook
  const total = times?.total_minutes ?? (prep + cook);
  
  return {
    prep_minutes: prep,
    cook_minutes: cook,
    total_minutes: total,
  };
}

/**
 * Generate ISO date string for today
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize a raw recipe into a fully-populated recipe
 */
export function normalizeRecipe(raw: RawRecipe): NormalizedRecipe {
  const now = today();
  
  return {
    // Identity (required, passed through)
    title: raw.title,
    slug: raw.slug,
    
    // Metadata with defaults
    description: raw.description ?? '',
    servings: raw.servings ?? 4,
    source_url: raw.source_url ?? '',
    tags: raw.tags ?? [],
    
    // Normalized times
    times: normalizeTimes(raw.times),
    
    // Content with empty array defaults
    ingredients: raw.ingredients ?? [],
    instructions: raw.instructions ?? [],
    notes: raw.notes ?? '',
    
    // Timestamps
    created_at: raw.created_at ?? now,
    updated_at: raw.updated_at ?? now,
    
    // Markdown body
    body: raw.body ?? '',
  };
}

/**
 * Generate a slug from a title
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Collapse multiple hyphens
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Format minutes as human-readable duration
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}


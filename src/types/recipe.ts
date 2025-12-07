/**
 * Recipe Type Definitions
 * 
 * RawRecipe: Directly parsed from YAML frontmatter (all optional except identity)
 * NormalizedRecipe: After build-time processing (defaults applied, totals calculated)
 */

// Ingredient as stored in YAML
export interface Ingredient {
  item: string;
  amount?: string;
  note?: string;
}

// Time fields for prep/cook/total
export interface RecipeTimes {
  prep_minutes?: number;
  cook_minutes?: number;
  total_minutes?: number;
}

// Normalized times with calculated total
export interface NormalizedTimes {
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
}

/**
 * RawRecipe - Parsed directly from YAML frontmatter
 * Only title and slug are required (identity fields)
 */
export interface RawRecipe {
  // Identity (required)
  title: string;
  slug: string;
  
  // Optional metadata
  description?: string;
  servings?: number;
  source_url?: string;
  tags?: string[];
  
  // Times
  times?: RecipeTimes;
  
  // Content
  ingredients?: Ingredient[];
  instructions?: string[];
  notes?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Markdown body (parsed separately from frontmatter)
  body?: string;
}

/**
 * NormalizedRecipe - After build-time normalization
 * All fields have sensible defaults, arrays are never undefined
 */
export interface NormalizedRecipe {
  // Identity
  title: string;
  slug: string;
  
  // Metadata (with defaults)
  description: string;
  servings: number;
  source_url: string;
  tags: string[];
  
  // Times (calculated)
  times: NormalizedTimes;
  
  // Content (arrays always exist)
  ingredients: Ingredient[];
  instructions: string[];
  notes: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Markdown body
  body: string;
}

/**
 * Recipe for API responses (includes computed fields)
 */
export interface RecipeResponse extends NormalizedRecipe {
  // URL path to recipe
  url: string;
}

/**
 * Input for creating/updating recipes
 */
export interface RecipeInput {
  title: string;
  slug?: string; // Auto-generated from title if not provided
  description?: string;
  servings?: number;
  source_url?: string;
  tags?: string[];
  times?: RecipeTimes;
  ingredients?: Ingredient[];
  instructions?: string[];
  notes?: string;
  body?: string;
}

/**
 * Tag with count for tag index
 */
export interface TagCount {
  tag: string;
  count: number;
}

/**
 * Tags index output
 */
export interface TagsIndex {
  tags: TagCount[];
  total: number;
}


/**
 * Hand-written TypeScript shapes for Supabase rows read directly from the
 * browser. HTTP request/response bodies for the FastAPI server live in the
 * auto-generated `api.generated.ts` (run `npm run codegen:api` to refresh).
 */

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
  location?: string;
  context?: Record<string, unknown>;
  onboarding_raw_context?: Record<string, unknown>;
  prompt_suggestions?: { prompts: string[] } | null;
  created_at: string;
  updated_at: string;
}

/** A single user-authored entry inside `threads.comments` (JSONB array). */
export interface ThreadComment {
  message: string;
  timestamp: string;
}

export interface Thread {
  id: string;
  user_id: string;
  title?: string;
  context?: Record<string, unknown>;
  comments?: ThreadComment[];
  created_at: string;
  updated_at: string;
}

export interface ThreadSummary {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  thread_id: string;
  name: string;
  description?: string | null;
  outfit_order?: number;
  is_cached?: boolean;
  saved?: boolean;
  vton_image_url?: string | null;
  default_rendering_url?: string | null;
  created_at: string;
  updated_at: string;
  outfit_items?: OutfitItem[];
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  type: string;
  title?: string | null;
  keywords?: string | null;
  item_order?: number;
  search_results: SearchResult[];
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  title: string;
  price: string;
  imageUrl?: string;
  link: string;
  productId?: string;
  source?: string;
  original_index?: number;
  ranking?: number;
  rating?: number;
  reviews?: number;
}

export interface SavedProduct {
  id: string;
  user_id: string;
  outfit_id?: string | null;
  outfit_item_id?: string | null;
  link: string;
  title?: string | null;
  price?: string | null;
  image_url?: string | null;
  source?: string | null;
  product_id?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  api_provider?: string | null;
  snapshot: SearchResult;
  created_at: string;
  updated_at: string;
}

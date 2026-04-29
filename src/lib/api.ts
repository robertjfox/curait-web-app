import axios from "axios";
import type { components } from "@/types/api.generated";
import type {
  Thread,
  ThreadSummary,
  Outfit,
  User,
  SavedProduct,
  SearchResult,
} from "@/types/api";

type Schemas = components["schemas"];
type ThreadCreateRequest = Schemas["ThreadCreateRequest"];
type ThreadChatRequest = Schemas["ThreadChatRequest"];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export interface CreateThreadResponse {
  success: boolean;
  thread_id: string;
}

export interface ChatResponse {
  success: boolean;
  thread_id: string;
}

export interface SearchAndRankResponse {
  success: boolean;
  [key: string]: unknown;
}

export interface RemixOutfitResponse {
  success: boolean;
  thread_id: string;
  outfit_id: string;
  changed_items?: number;
}

export interface RevealNextOutfitResponse {
  success: boolean;
  thread_id: string;
  outfit_id?: string | null;
  revealed: boolean;
}

export interface SavedOutfitResponse {
  success: boolean;
  outfit: Outfit;
}

export interface CreateGuestUserResponse {
  success: boolean;
  user_id: string;
}

export interface UpdateUserProfileRequest {
  first_name?: string;
  location?: string;
  gender?: string;
  context?: Record<string, unknown>;
}

export interface UpdateUserProfileResponse {
  success: boolean;
  user: User;
}

export interface GetUserProfileResponse {
  success: boolean;
  user: User;
}

export interface GenerateAvatarResponse {
  image_url: string;
}

export interface GenerateStyleBrandChipsRequest {
  gender?: string;
  location?: string;
  job?: string;
}

export interface GenerateStyleBrandChipsResponse {
  success: boolean;
  brands: string[];
}

interface ListThreadsResponse {
  success: boolean;
  threads: ThreadSummary[];
}

interface GetThreadResponse {
  success: boolean;
  thread: Thread;
}

interface ListOutfitsResponse {
  success: boolean;
  outfits: Outfit[];
}

interface DeleteThreadResponse {
  success: boolean;
  thread_id: string;
}

interface ToggleSavedProductRequest {
  saved: boolean;
  product: SearchResult;
  outfit_id?: string | null;
  outfit_item_id?: string | null;
}

interface ToggleSavedProductResponse {
  success: boolean;
  saved_product?: SavedProduct;
}

interface ListSavedProductsResponse {
  success: boolean;
  products: SavedProduct[];
}

export const apiClient = {
  async createGuestUser(): Promise<CreateGuestUserResponse> {
    const { data } = await api.post<CreateGuestUserResponse>("/api/users/guest");
    return data;
  },

  async updateUserProfile(
    userId: string,
    profile: UpdateUserProfileRequest
  ): Promise<UpdateUserProfileResponse> {
    const { data } = await api.patch<UpdateUserProfileResponse>(
      `/api/users/${encodeURIComponent(userId)}`,
      profile
    );
    return data;
  },

  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data } = await api.get<GetUserProfileResponse>(
        `/api/users/${encodeURIComponent(userId)}`
      );
      return data.user ?? null;
    } catch {
      return null;
    }
  },

  async generateAvatar(
    userId: string,
    selfie: File
  ): Promise<GenerateAvatarResponse> {
    const formData = new FormData();
    formData.append("selfie", selfie);
    const { data } = await api.post<GenerateAvatarResponse>(
      `/api/avatars/${encodeURIComponent(userId)}/generate`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  async generateStyleBrandChips(
    request: GenerateStyleBrandChipsRequest
  ): Promise<string[]> {
    const { data } = await api.post<GenerateStyleBrandChipsResponse>(
      "/api/users/style-brand-chips",
      request
    );
    return data.brands ?? [];
  },

  async createThread(userId: string): Promise<CreateThreadResponse> {
    const body: ThreadCreateRequest = { user_id: userId };
    const { data } = await api.post<CreateThreadResponse>(
      "/api/threads/create",
      body
    );
    return data;
  },

  async sendChatMessage(
    threadId: string,
    message: string
  ): Promise<ChatResponse> {
    const body: ThreadChatRequest = { message };
    const { data } = await api.post<ChatResponse>(
      `/api/threads/${encodeURIComponent(threadId)}/chat`,
      body
    );
    return data;
  },

  async searchAndRankOutfit(outfitId: string): Promise<SearchAndRankResponse> {
    const { data } = await api.post<SearchAndRankResponse>(
      `/api/outfits/${encodeURIComponent(outfitId)}/search-and-rank`
    );
    return data;
  },

  async remixOutfit(
    outfitId: string,
    feedback: string
  ): Promise<RemixOutfitResponse> {
    const { data } = await api.post<RemixOutfitResponse>(
      `/api/outfits/${encodeURIComponent(outfitId)}/remix`,
      { feedback }
    );
    return data;
  },

  async setOutfitSaved(
    outfitId: string,
    saved: boolean
  ): Promise<SavedOutfitResponse> {
    const { data } = await api.patch<SavedOutfitResponse>(
      `/api/outfits/${encodeURIComponent(outfitId)}/saved`,
      { saved }
    );
    return data;
  },

  async revealNextOutfit(threadId: string): Promise<RevealNextOutfitResponse> {
    const { data } = await api.post<RevealNextOutfitResponse>(
      `/api/threads/${encodeURIComponent(threadId)}/outfits/next`
    );
    return data;
  },

  async listUserThreads(userId: string): Promise<ThreadSummary[]> {
    const { data } = await api.get<ListThreadsResponse>(
      `/api/threads/by-user/${encodeURIComponent(userId)}`
    );
    return data.threads ?? [];
  },

  async getThread(threadId: string): Promise<Thread | null> {
    try {
      const { data } = await api.get<GetThreadResponse>(
        `/api/threads/${encodeURIComponent(threadId)}`
      );
      return data.thread ?? null;
    } catch {
      return null;
    }
  },

  async listThreadOutfits(threadId: string): Promise<Outfit[]> {
    const { data } = await api.get<ListOutfitsResponse>(
      `/api/threads/${encodeURIComponent(threadId)}/outfits`
    );
    return data.outfits ?? [];
  },

  async listSavedOutfits(userId: string): Promise<Outfit[]> {
    const { data } = await api.get<ListOutfitsResponse>(
      `/api/outfits/saved/by-user/${encodeURIComponent(userId)}`
    );
    return data.outfits ?? [];
  },

  async deleteThread(threadId: string): Promise<DeleteThreadResponse> {
    const { data } = await api.delete<DeleteThreadResponse>(
      `/api/threads/${encodeURIComponent(threadId)}`
    );
    return data;
  },

  async toggleSavedProduct(
    userId: string,
    body: ToggleSavedProductRequest
  ): Promise<ToggleSavedProductResponse> {
    const { data } = await api.post<ToggleSavedProductResponse>(
      `/api/users/${encodeURIComponent(userId)}/saved-products`,
      body
    );
    return data;
  },

  async listSavedProducts(userId: string): Promise<SavedProduct[]> {
    const { data } = await api.get<ListSavedProductsResponse>(
      `/api/users/${encodeURIComponent(userId)}/saved-products`
    );
    return data.products ?? [];
  },
};

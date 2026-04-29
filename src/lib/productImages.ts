import type { SearchResult } from "@/types/api";

type ProductWithImageAliases = SearchResult & {
  thumbnail?: string;
  thumbnailUrl?: string;
  image?: string;
  image_url?: string;
  serpapi_thumbnail?: string;
};

export function getProductImageUrl(product: SearchResult): string | null {
  const p = product as ProductWithImageAliases;
  return (
    p.imageUrl ||
    p.thumbnail ||
    p.thumbnailUrl ||
    p.image ||
    p.image_url ||
    p.serpapi_thumbnail ||
    null
  );
}

export function getImageBackedProducts(products: SearchResult[]): SearchResult[] {
  return products.filter((product) => Boolean(getProductImageUrl(product)));
}

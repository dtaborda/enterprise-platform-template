import type { BrandConfig } from "@enterprise/contracts";
import type { Metadata } from "next";

/**
 * Generates a Next.js Metadata object from a resolved BrandConfig.
 * Call this from generateMetadata() in ui/app/layout.tsx.
 *
 * @example
 * export async function generateMetadata() {
 *   const brand = await resolveBrand();
 *   return generateBrandMetadata(brand);
 * }
 */
export function generateBrandMetadata(brand: BrandConfig): Metadata {
  return {
    title: {
      template: brand.metadata.titleTemplate,
      default: brand.metadata.defaultTitle,
    },
    description: brand.metadata.description,
    icons: {
      icon: brand.favicon,
    },
    openGraph: {
      title: brand.metadata.defaultTitle,
      description: brand.metadata.description,
      images: brand.metadata.ogImage ? [brand.metadata.ogImage] : [],
    },
  };
}

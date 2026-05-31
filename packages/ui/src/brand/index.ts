// Brand module barrel — re-exports for consumers that prefer the index import.
// For server-only utilities (resolveBrand), import from the specific subpath.

export type { BrandContextValue } from "./context";
export { BrandContext } from "./context";
export { generateBrandMetadata } from "./metadata";
export type { BrandProviderProps } from "./provider";
export { BrandProvider, useBrand } from "./provider";

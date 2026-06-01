// Brand module barrel — re-exports for consumers that prefer the index import.
// For server-only utilities (resolveBrand), import from the specific subpath.

export type { BrandFooterProps } from "./brand-footer";
export { BrandFooter } from "./brand-footer";
export type { BrandLogoProps } from "./brand-logo";
export { BrandLogo } from "./brand-logo";
export type { BrandContextValue } from "./context";
export { BrandContext } from "./context";
export { generateBrandMetadata } from "./metadata";
export type { BrandProviderProps } from "./provider";
export { BrandProvider, useBrand } from "./provider";

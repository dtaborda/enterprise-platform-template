// @enterprise/brand — public barrel export
// For tree-shaking and subpath imports, prefer specific subpaths:
//   import { BrandProvider } from "@enterprise/brand/provider"
//   import { resolveBrand }   from "@enterprise/brand/resolve"

export type { BrandFooterProps } from "./brand/brand-footer";
export { BrandFooter } from "./brand/brand-footer";
export type { BrandLogoProps } from "./brand/brand-logo";
export { BrandLogo } from "./brand/brand-logo";
export type { BrandContextValue } from "./brand/context";
export { BrandContext } from "./brand/context";
export { generateBrandMetadata } from "./brand/metadata";
export type { BrandProviderProps } from "./brand/provider";
export { BrandProvider, useBrand } from "./brand/provider";
export {
  buildRegistry,
  getAllBrands,
  getBrandBySlug,
  getBrandRegistry,
  getDefaultBrand,
} from "./brand/registry";
export { resolveBrand, resolveBrandFromRegistry } from "./brand/resolve";

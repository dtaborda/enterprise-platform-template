"use client";

import { cn } from "@enterprise/ui/lib/utils";
import { useBrand } from "./provider";

// ============================================================================
// BrandFooter
// ============================================================================

export interface BrandFooterProps {
  /**
   * Optional Tailwind class(es) to apply to the root <footer> element.
   */
  className?: string;
}

/**
 * BrandFooter — renders the brand's copyright, legal links, social links,
 * and optional "Powered by" attribution.
 *
 * - Copyright: © {year} {brand.displayName}
 * - Legal links: only rendered when privacyUrl/termsUrl are non-empty strings
 * - Social links: only rendered when brand.social is present
 * - "Powered by": only rendered when brand.features?.showPoweredBy === true
 *
 * Must be rendered inside a BrandProvider.
 */
export function BrandFooter({ className }: BrandFooterProps) {
  const brand = useBrand();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn(className)}>
      <p>
        © {currentYear} {brand.displayName}
      </p>

      <nav aria-label="Legal links">
        {brand.legal.privacyUrl && (
          <a href={brand.legal.privacyUrl} rel="noopener noreferrer">
            Privacy Policy
          </a>
        )}
        {brand.legal.termsUrl && (
          <a href={brand.legal.termsUrl} rel="noopener noreferrer">
            Terms of Service
          </a>
        )}
      </nav>

      {brand.social && (
        <nav aria-label="Social links">
          {brand.social.twitter && (
            <a href={brand.social.twitter} rel="noopener noreferrer" aria-label="Twitter">
              Twitter
            </a>
          )}
          {brand.social.linkedin && (
            <a href={brand.social.linkedin} rel="noopener noreferrer" aria-label="LinkedIn">
              LinkedIn
            </a>
          )}
          {brand.social.github && (
            <a href={brand.social.github} rel="noopener noreferrer" aria-label="GitHub">
              GitHub
            </a>
          )}
        </nav>
      )}

      {brand.features?.["showPoweredBy"] === true && (
        <p>
          <small>Powered by Enterprise Platform</small>
        </p>
      )}
    </footer>
  );
}

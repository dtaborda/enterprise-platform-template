import type { BrandConfig } from "@enterprise/contracts";

const enterpriseBrand: BrandConfig = {
  slug: "enterprise",
  name: "enterprise",
  displayName: "Enterprise Platform",
  description: "The enterprise-grade SaaS platform template.",
  logo: {
    light: {
      src: "/images/enterprise/logo-light.svg",
      alt: "Enterprise Platform",
      width: 160,
      height: 32,
    },
    dark: {
      src: "/images/enterprise/logo-dark.svg",
      alt: "Enterprise Platform",
      width: 160,
      height: 32,
    },
  },
  favicon: "/images/enterprise/favicon.svg",
  metadata: {
    titleTemplate: "%s | Enterprise Platform",
    defaultTitle: "Enterprise Platform",
    description: "The enterprise-grade SaaS platform template for modern teams.",
    ogImage: "/images/enterprise/og-image.png",
  },
  legal: {
    // Replace these placeholder URLs with your actual legal pages before go-live
    privacyUrl: "#",
    termsUrl: "#",
  },
  social: {
    github: "https://github.com/your-org",
  },
  themeRef: "light",
  features: {
    showPoweredBy: true,
  },
  isDefault: true,
};

export default enterpriseBrand;

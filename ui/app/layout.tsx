import { generateBrandMetadata } from "@enterprise/brand/metadata";
import { BrandProvider } from "@enterprise/brand/provider";
import { resolveBrand } from "@enterprise/brand/resolve";
import { deriveThemeMode } from "@enterprise/brand/theme-mode";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await resolveBrand();
  return generateBrandMetadata(brand);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await resolveBrand();
  // Derive the initial theme from the brand so SSR and client-side hydration
  // always agree.  ThemeProvider reads the same brand.themeRef via deriveThemeMode,
  // so on a fresh visit (empty localStorage) there is no post-hydration flip.
  const initialThemeMode = deriveThemeMode(brand.themeRef);

  return (
    <html
      lang="en"
      data-theme={initialThemeMode}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakartaSans.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <BrandProvider brand={brand}>{children}</BrandProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

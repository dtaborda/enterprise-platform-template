"use client";

import type { BrandConfig } from "@enterprise/contracts";
import { createContext } from "react";

export interface BrandContextValue {
  brand: BrandConfig;
}

export const BrandContext = createContext<BrandContextValue | null>(null);

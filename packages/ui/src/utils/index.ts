// UI utilities - classname merging and other utilities

import { type ClassValue, clsx } from "clsx";
import { type ComponentType, createElement, type ElementType, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

/** Merge class names with tailwind-merge */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Create a variant function for component variants */
export function createVariant<T extends string>(variants: Record<T, ClassValue[]>) {
  return (...variantKeys: T[]): string => {
    return cn(...variantKeys.flatMap((key) => variants[key] ?? []));
  };
}

/** Create cva (class-variance-authority) compatible function */
export function cva(
  base: ClassValue,
  config?: {
    variants?: Record<string, Record<string, ClassValue[]>>;
    defaultVariants?: Record<string, string>;
    compoundVariants?: Array<{
      [key: string]: string;
    }>;
  },
) {
  return (variantProps?: Record<string, string>): string => {
    const classes: ClassValue[] = [base];

    // Apply variants
    if (config?.variants && variantProps) {
      for (const [variantName, variantValues] of Object.entries(config.variants)) {
        const selectedValue = variantProps[variantName];
        if (selectedValue && variantValues[selectedValue]) {
          classes.push(variantValues[selectedValue]);
        }
      }
    }

    // Apply default variants
    if (config?.defaultVariants) {
      for (const [variantName, defaultValue] of Object.entries(config.defaultVariants)) {
        const value = variantProps?.[variantName] ?? defaultValue;
        if (value && config.variants?.[variantName]?.[value]) {
          classes.push(config.variants[variantName][value]);
        }
      }
    }

    // Apply compound variants
    if (config?.compoundVariants && variantProps) {
      for (const compound of config.compoundVariants) {
        const matches = Object.entries(compound).every(
          ([key, value]) => variantProps[key] === value,
        );
        const compoundClass = compound["class"];
        if (matches && compoundClass) {
          classes.push(compoundClass);
        }
      }
    }

    return cn(...classes);
  };
}

/** Simple slot component for composition */
export function slot<P extends object>(
  Component: ComponentType<P> | ElementType | null | undefined,
  props: P,
  fallback?: ReactNode,
) {
  if (!Component) {
    return fallback ?? null;
  }

  return createElement(Component as ComponentType<P>, props);
}

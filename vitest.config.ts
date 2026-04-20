import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "contracts",
          root: "./packages/contracts",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "core",
          root: "./packages/core",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "ui",
          root: "./packages/ui",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "web",
          root: "./ui",
          environment: "node",
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: ["e2e/**", "node_modules/**", ".next/**"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "packages/contracts/src/**/*.ts",
        "packages/core/src/**/*.ts",
        "packages/db/src/**/*.ts",
        "packages/ui/src/**/*.ts",
        "ui/lib/**/*.ts",
        "ui/features/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/index.ts",
        "packages/core/src/supabase/admin.ts",
        "packages/core/src/supabase/client.ts",
        "packages/core/src/supabase/server.ts",
        "packages/core/src/supabase/middleware.ts",
      ],
      thresholds: {
        "packages/contracts/src/**/*.ts": {
          lines: 80,
          branches: 80,
        },
        "packages/core/src/**/*.ts": {
          lines: 70,
          branches: 65,
        },
        "packages/db/src/**/*.ts": {
          lines: 60,
          branches: 55,
        },
      },
    },
  },
});

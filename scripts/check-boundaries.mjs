#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();

const allowedWorkspaceImports = {
  "packages/contracts": [],
  "packages/db": [],
  "packages/core": ["@enterprise/contracts", "@enterprise/db"],
  "packages/ui": ["@enterprise/contracts"],
  ui: ["@enterprise/contracts", "@enterprise/core", "@enterprise/ui", "@enterprise/db"],
};

const ignoredDirectories = new Set(["node_modules", ".next", "dist", ".turbo", ".git"]);
const workspaceRoots = Object.keys(allowedWorkspaceImports);

function collectFiles(directory) {
  const files = [];
  const entries = readdirSync(directory);

  for (const entry of entries) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      files.push(...collectFiles(absolutePath));
      continue;
    }

    if (entry.endsWith(".ts") || entry.endsWith(".tsx") || entry.endsWith(".mts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getWorkspaceRoot(filePath) {
  const repoRelativePath = relative(repoRoot, filePath).replace(/\\/g, "/");
  return (
    workspaceRoots.find((workspaceRoot) => repoRelativePath.startsWith(`${workspaceRoot}/`)) ?? null
  );
}

function getImports(fileContent) {
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?from\s+)?["']([^"']+)["']/g;
  const imports = [];
  let match = importRegex.exec(fileContent);

  while (match) {
    imports.push(match[1]);
    match = importRegex.exec(fileContent);
  }

  return imports;
}

const violations = [];

for (const workspaceRoot of workspaceRoots) {
  const rootPath = join(repoRoot, workspaceRoot);
  const files = collectFiles(rootPath);

  for (const filePath of files) {
    const sourceWorkspace = getWorkspaceRoot(filePath);

    if (!sourceWorkspace) {
      continue;
    }

    const allowedTargets = allowedWorkspaceImports[sourceWorkspace];
    const fileContent = readFileSync(filePath, "utf8");
    const importSpecifiers = getImports(fileContent);

    for (const importSpecifier of importSpecifiers) {
      if (!importSpecifier.startsWith("@enterprise/")) {
        continue;
      }

      if (/^@enterprise\/[a-z-]+\/(src|schema\/platform)/.test(importSpecifier)) {
        violations.push({
          filePath,
          reason: `Deep package import is not allowed: ${importSpecifier}`,
        });
        continue;
      }

      const packageMatch = importSpecifier.match(/^@enterprise\/[a-z-]+/);

      if (!packageMatch) {
        continue;
      }

      const targetPackage = packageMatch[0];

      if (targetPackage === "@enterprise/web" && sourceWorkspace !== "ui") {
        violations.push({
          filePath,
          reason: "Packages MUST NOT import from @enterprise/web",
        });
        continue;
      }

      if (sourceWorkspace === "ui") {
        if (!allowedTargets.includes(targetPackage)) {
          violations.push({
            filePath,
            reason: `ui can only import ${allowedTargets.join(", ")}; found ${targetPackage}`,
          });
        }

        continue;
      }

      const sourcePackageName = `@enterprise/${sourceWorkspace.split("/")[1]}`;

      if (targetPackage === sourcePackageName) {
        continue;
      }

      if (!allowedTargets.includes(targetPackage)) {
        violations.push({
          filePath,
          reason: `${sourceWorkspace} cannot import ${targetPackage}`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\nBoundary check failed:\n");

  for (const violation of violations) {
    console.error(`- ${relative(repoRoot, violation.filePath)} — ${violation.reason}`);
  }

  process.exit(1);
}

console.log("Boundary check passed.");

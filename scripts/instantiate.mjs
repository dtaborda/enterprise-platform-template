#!/usr/bin/env node
/**
 * Enterprise Platform Template Instantiation CLI
 *
 * Usage:
 *   node scripts/instantiate.mjs --name "My App" --domain "myapp.com"
 *   node scripts/instantiate.mjs -n "My App" -d myapp.com -o /path/to/output
 *
 * This script instantiates a new enterprise application from the platform template.
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

const options = {
  name: {
    type: "string",
    short: "n",
    description: 'Application name (e.g., "My App")',
  },
  domain: {
    type: "string",
    short: "d",
    description: 'Domain for the application (e.g., "myapp.com")',
  },
  outputDir: {
    type: "string",
    short: "o",
    default: ".",
    description: "Output directory for the new application",
  },
  packagePrefix: {
    type: "string",
    short: "p",
    default: "",
    description: "Package prefix (default: derived from domain)",
  },
  help: {
    type: "boolean",
    short: "h",
    description: "Show this help message",
  },
};

/**
 * Validate domain format
 */
function validateDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }
  return domain.toLowerCase();
}

/**
 * Derive package prefix from domain (e.g., "myapp.com" -> "@myapp")
 */
function derivePackagePrefix(domain) {
  const parts = domain.split(".");
  // Take first part, remove hyphens, make it camelCase-ish
  let prefix = parts[0].replace(/-/g, "");
  // Convert to lowercase for npm package name
  return prefix.toLowerCase();
}

/**
 * Replace placeholders in file content
 */
function replacePlaceholders(content, replacements) {
  let result = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    // Replace all occurrences
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * Process a file (replace content if it's text)
 */
function processFile(filePath, replacements) {
  const ext = filePath.split(".").pop();
  const textExtensions = [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "md",
    "yaml",
    "yml",
    "toml",
    "html",
    "css",
    "sql",
  ];

  if (textExtensions.includes(ext)) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const replaced = replacePlaceholders(content, replacements);
      writeFileSync(filePath, replaced, "utf-8");
    } catch (e) {
      // Binary file or error - skip
    }
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath, replacements) {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    // Skip certain directories/files
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === ".next" ||
      entry === "dist" ||
      entry === "coverage" ||
      entry === ".turbo"
    ) {
      continue;
    }

    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath, replacements);
    } else {
      processFile(fullPath, replacements);
    }
  }
}

/**
 * Rename package references in package.json files
 */
function renamePackageReferences(dirPath, oldPrefix, newPrefix) {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      renamePackageReferences(fullPath, oldPrefix, newPrefix);
    } else if (entry === "package.json") {
      try {
        const content = JSON.parse(readFileSync(fullPath, "utf-8"));

        // Rename name field
        if (content.name && content.name.startsWith(oldPrefix)) {
          content.name = content.name.replace(oldPrefix, newPrefix);
        }

        // Update workspace references
        if (content.dependencies) {
          for (const [key, value] of Object.entries(content.dependencies)) {
            if (key.startsWith(oldPrefix)) {
              delete content.dependencies[key];
              content.dependencies[key.replace(oldPrefix, newPrefix)] = value;
            }
          }
        }

        if (content.devDependencies) {
          for (const [key, value] of Object.entries(content.devDependencies)) {
            if (key.startsWith(oldPrefix)) {
              delete content.devDependencies[key];
              content.devDependencies[key.replace(oldPrefix, newPrefix)] = value;
            }
          }
        }

        writeFileSync(fullPath, JSON.stringify(content, null, 2) + "\n", "utf-8");
      } catch (e) {
        // Not a valid JSON or other error - skip
      }
    }
  }
}

/**
 * Main instantiation function
 */
async function instantiate(opts) {
  const { name, domain, outputDir } = opts;

  // Validate required arguments
  if (!name || !domain) {
    console.error("Error: Both --name and --domain are required");
    console.error('Usage: node scripts/instantiate.mjs --name "My App" --domain "myapp.com"');
    process.exit(1);
  }

  // Validate and normalize inputs
  const normalizedDomain = validateDomain(domain);
  const packagePrefix = opts.packagePrefix || derivePackagePrefix(normalizedDomain);
  const scope = packagePrefix.startsWith("@") ? packagePrefix : `@${packagePrefix}`;

  console.log("=".repeat(60));
  console.log("🚀 Enterprise Platform Instantiation");
  console.log("=".repeat(60));
  console.log(`  App Name:     ${name}`);
  console.log(`  Domain:      ${normalizedDomain}`);
  console.log(`  Package:      ${scope}`);
  console.log(`  Output:      ${outputDir}`);
  console.log("=".repeat(60));

  // Create output directory if needed
  if (outputDir !== ".") {
    if (statSync(outputDir, { throwIfNoEntry: false })) {
      console.error(`Error: Output directory already exists: ${outputDir}`);
      process.exit(1);
    }
    mkdirSync(outputDir, { recursive: true });
  }

  // Copy template files
  console.log("\n📦 Copying template files...");
  try {
    copyTemplate(ROOT_DIR, outputDir, [
      ".git",
      "node_modules",
      ".next",
      "dist",
      "coverage",
      ".turbo",
      "playwright-report",
      "test-results",
    ]);
    console.log("  ✓ Files copied");
  } catch (e) {
    console.error(`  ✗ Error copying files: ${e.message}`);
    process.exit(1);
  }

  // Define replacements
  const replacements = {
    "{{APP_NAME}}": name,
    "{{APP_DOMAIN}}": normalizedDomain,
    "{{PACKAGE_PREFIX}}": packagePrefix,
    "{{SCOPE}}": scope,
    "@enterprise/contracts": `${scope}/contracts`,
    "@enterprise/core": `${scope}/core`,
    "@enterprise/db": `${scope}/db`,
    "@enterprise/ui": `${scope}/ui`,
    "enterprise-platform": packagePrefix,
    "Enterprise Platform Template": name,
    "enterprise-platform-template": packagePrefix,
  };

  // Process all files
  console.log("\n🔄 Processing files...");
  processDirectory(outputDir, replacements);
  console.log("  ✓ Placeholders replaced");

  // Rename packages
  console.log("\n📝 Renaming packages...");
  renamePackageReferences(outputDir, "@enterprise/", `${scope}/`);
  console.log("  ✓ Package names updated");

  // Clean up script (don't include instantiate script in new app)
  const scriptPath = join(outputDir, "scripts", "instantiate.mjs");
  try {
    rmSync(scriptPath);
    console.log("  ✓ Instantiation script removed");
  } catch (e) {
    // Script might not exist
  }

  // Validate package.json files
  console.log("\n✅ Validating...");
  const { execSync } = await import("child_process");
  try {
    execSync("pnpm install --ignore-scripts", { cwd: outputDir, stdio: "pipe" });
    console.log("  ✓ Dependencies installed");
  } catch (e) {
    console.log(`  ⚠️  Warning: Could not install dependencies: ${e.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Instantiation complete!");
  console.log("=".repeat(60));
  console.log(`\nNext steps:`);
  console.log(`  cd ${outputDir}`);
  console.log(`  cp .env.example .env.local`);
  console.log(`  # Fill in your environment variables`);
  console.log(`  pnpm build`);
  console.log(`  pnpm dev`);
  console.log("=".repeat(60));
}

/**
 * Copy directory recursively with exclusions
 */
function copyTemplate(src, dest, exclude = []) {
  if (!statSync(src, { throwIfNoEntry: false })) {
    mkdirSync(dest, { recursive: true });
    return;
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    if (exclude.includes(entry)) continue;

    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, exclude);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

// Parse arguments
const parsedArgs = parseArgs({ options });

// Show help
if (parsedArgs.values.help) {
  console.log("Enterprise Platform Template Instantiation CLI");
  console.log("");
  console.log("Usage: node scripts/instantiate.mjs [options]");
  console.log("");
  console.log("Options:");
  Object.entries(options).forEach(([key, val]) => {
    const short = val.short ? ` -${val.short},` : "    ";
    console.log(
      `  ${short} --${key}${val.type === "boolean" ? "" : " <value>"}  ${val.description}`,
    );
  });
  console.log("");
  console.log("Examples:");
  console.log('  node scripts/instantiate.mjs --name "My App" --domain "myapp.com"');
  console.log('  node scripts/instantiate.mjs -n "My App" -d myapp.com -o ./my-app');
  console.log('  node scripts/instantiate.mjs -n "My App" -d myapp.com -p "@mycompany"');
  process.exit(0);
}

// Run instantiation
instantiate(parsedArgs.values).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

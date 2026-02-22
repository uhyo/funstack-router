# Distributing AI Agent Skills via npm Packages

**A technique used by `@funstack/static` to ship Claude Code (and other AI agent) skills alongside a library.**

## Overview

When you publish an npm package, you can bundle AI agent skills (e.g. for Claude Code, Cursor, Copilot, etc.) so that consumers of your library get context-aware AI assistance out of the box. This document explains the technique used by the `@funstack/static` project.

The approach has three parts:

1. **Define the skill** as a `SKILL.md` file inside your package
2. **Include it in the npm distribution** via the `files` field in `package.json`
3. **Provide an installer binary** that copies the skill into the consumer's project

## Step 1: Define the Skill

Create a `skills/` directory in your package with a `SKILL.md` file:

```
my-package/
  src/
  skills/
    my-package-knowledge/
      SKILL.md
  package.json
```

The `SKILL.md` follows the standard skill format with YAML frontmatter:

```markdown
---
name: my-package-knowledge
description: Use this skill when you need information about `my-package`. API references, best practices, etc.
---

# My Package Knowledge

My Package is a library that does X, Y, Z...

## More detailed docs

More detailed documentation can be found at:

    node_modules/my-package/dist/docs/index.md
```

The skill file can reference additional documentation bundled in the package (see the optional Step 4 below).

## Step 2: Include the Skill in npm Distribution

In your `package.json`, add the `skills` directory to the `files` array so it gets published to npm:

```json
{
  "name": "my-package",
  "files": ["dist", "skills"]
}
```

## Step 3: Provide an Installer Binary

Consumers need a way to install the skill into their project's `.claude/skills/` (or equivalent) directory. The `@funstack/skill-installer` package handles this with an interactive prompt that supports multiple AI agents.

### 3a. Add the dependency

```json
{
  "dependencies": {
    "@funstack/skill-installer": "^1.0.0"
  }
}
```

### 3b. Write a small installer script

Create a file like `src/bin/skill-installer.ts`:

```typescript
#! /usr/bin/env node

import { install } from "@funstack/skill-installer";
import path from "node:path";

const skillDir = "./node_modules/my-package/skills/my-package-knowledge";

const resolved = path.resolve(skillDir);

console.log("Installing skill from:", resolved);

await install(resolved);
```

The `install()` function presents an interactive menu letting the user choose their AI agent (Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf, OpenCode), then copies the skill files to the appropriate directory (e.g. `.claude/skills/` for Claude Code).

For non-interactive environments (CI/CD), the `SKILL_INSTALL_PATH` environment variable can be set to skip the prompt.

### 3c. Register it as a bin entry

```json
{
  "bin": {
    "my-package-skill-installer": "./dist/bin/skill-installer.mjs"
  }
}
```

### Consumer usage

Consumers run:

```sh
npx -p my-package my-package-skill-installer
# or
pnpm dlx --package my-package my-package-skill-installer
# or
yarn dlx -p my-package my-package-skill-installer
```

The `-p`/`--package` flag tells the package manager to use the package even if it's not installed locally yet. This copies the skill into their project so their AI agent can use it.

## Step 4 (Optional): Bundle AI-Friendly Documentation

You can go a step further and bundle detailed documentation alongside the skill. The idea is to generate a self-contained Markdown documentation bundle at build time, include it in the published package, and have the `SKILL.md` point to it. This gives the AI agent access to comprehensive reference material directly from `node_modules`, with no network access required.

### 4a. Write a docs generation script

Create a script (e.g. `scripts/generate-ai-docs.ts`) that:

1. Recursively finds all documentation source files (e.g. `.mdx` files)
2. Copies them to `dist/docs/`, renaming to `.md`
3. Extracts metadata (title and description) from each file
4. Generates an `index.md` that serves as a table of contents

Here is the approach used by `@funstack/static`:

````typescript
// scripts/generate-ai-docs.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DOCS_PAGES_DIR = path.resolve("../docs/src/pages");
const OUTPUT_DIR = path.resolve("dist/docs");

// 1. Recursively find all .mdx files
async function findMdxFiles(dir: string, basePath = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = path.join(basePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMdxFiles(path.join(dir, entry.name), rel)));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(rel);
    }
  }
  return files;
}

// 2. Extract title (first h1) and description (first paragraph) from each file
function extractMetadata(content: string) {
  const lines = content.split("\n");
  let title = "";
  let description = "";
  let foundTitle = false;
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (!foundTitle && match) {
      title = match[1];
      foundTitle = true;
      continue;
    }
    if (
      foundTitle &&
      line.trim() &&
      !line.startsWith("#") &&
      !line.startsWith("```")
    ) {
      description = line.trim();
      break;
    }
  }
  return { title, description };
}

// 3. Copy each .mdx file as .md
async function copyFile(relativePath: string) {
  const source = path.join(DOCS_PAGES_DIR, relativePath);
  const output = path.join(OUTPUT_DIR, relativePath.replace(/\.mdx$/, ".md"));
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.copyFile(source, output);
}

// 4. Generate index.md as a table of contents
function generateIndex(
  docs: { outputPath: string; title: string; description: string }[],
) {
  const lines = [
    "# My Package Documentation",
    "",
    "## Available Documentation",
    "",
  ];

  // Group files by their top-level directory
  const groups = new Map<string | null, typeof docs>();
  for (const doc of docs) {
    const parts = doc.outputPath.split("/");
    const dir = parts.length > 1 ? parts[0] : null;
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(doc);
  }

  // Root-level docs first
  for (const doc of groups.get(null) ?? []) {
    lines.push(`- [${doc.title}](./${doc.outputPath}.md) - ${doc.description}`);
  }

  // Then each subdirectory as a section
  for (const [dir, dirDocs] of groups) {
    if (dir === null) continue;
    lines.push("", `### ${dir.toUpperCase()}`, "");
    for (const doc of dirDocs) {
      lines.push(
        `- [${doc.title}](./${doc.outputPath}.md) - ${doc.description}`,
      );
    }
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const mdxFiles = await findMdxFiles(DOCS_PAGES_DIR);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Copy all files
  await Promise.all(mdxFiles.map(copyFile));

  // Extract metadata and generate index
  const docs = await Promise.all(
    mdxFiles.map(async (rel) => {
      const content = await fs.readFile(
        path.join(DOCS_PAGES_DIR, rel),
        "utf-8",
      );
      const { title, description } = extractMetadata(content);
      return {
        outputPath: rel.replace(/\.mdx$/, ""),
        title: title || path.basename(rel, ".mdx"),
        description,
      };
    }),
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, "index.md"),
    generateIndex(docs),
    "utf-8",
  );
}

main();
````

The generated `index.md` looks like this:

```markdown
# My Package Documentation

## Available Documentation

- [Getting Started](./getting-started.md) - Learn how to set up My Package.

### API

- [createApp](./api/createApp.md) - Creates a new application instance.
- [useData](./api/useData.md) - A hook for fetching data in components.
```

This index is important because it gives the AI agent a structured overview of all available docs with brief descriptions, allowing it to decide which files to read for more detail.

### 4b. Add a build script

```json
{
  "scripts": {
    "build:docs": "node --experimental-strip-types scripts/generate-ai-docs.ts"
  }
}
```

### 4c. Reference the docs from your skill

In your `SKILL.md`, point the AI agent to the bundled documentation:

```markdown
## Detailed Documentation

More detailed documentation (including API references and best practices) can be found at:

    node_modules/my-package/dist/docs/index.md
```

The AI agent will read `index.md` first to see what's available, then read individual doc files as needed.

### 4d. Run docs generation in CI before publishing

```yaml
# .github/workflows/publish.yml
- name: Build
  run: pnpm build

- name: Build AI-friendly docs
  run: pnpm --filter my-package build:docs

- name: Publish
  run: pnpm --filter my-package publish --access public
```

The docs generation must run after the main build (so `dist/` exists) and before publish (so the generated files are included). Since `dist` is already in the `files` array, the `dist/docs/` directory is automatically included in the published package.

## Summary of What Gets Published

```
my-package/                        (on npm)
  dist/
    bin/
      skill-installer.mjs          # The installer binary
    docs/                           # (Optional) AI-friendly docs
      index.md
      api/
        SomeComponent.md
        ...
    index.mjs                       # Your library code
  skills/
    my-package-knowledge/
      SKILL.md                      # The skill definition
```

## Key Design Decisions

- **Separate `skills/` directory**: Keep distributable skills separate from your own development-time skills (which live in `.claude/skills/` and are gitignored or project-local).
- **Explicit installer step**: Skills are not auto-installed on `npm install`. The consumer runs the installer explicitly. This keeps things transparent and avoids postinstall script surprises.
- **Multi-agent support**: By using `@funstack/skill-installer`, the same skill can be installed for Claude Code, Cursor, Copilot, and other agents, all from a single source.
- **Docs as data**: Bundling documentation as plain Markdown in the package means the AI agent can read it directly from `node_modules` without network access.

import * as fs from "node:fs/promises";
import * as path from "node:path";

const DOCS_PAGES_DIR = path.resolve("../docs/src/pages");
const OUTPUT_DIR = path.resolve("dist/docs");

// Content pages only — excludes layout wrappers (LearnPage, ApiReferencePage),
// index/overview pages, home page, and 404 page.
const CONTENT_PAGES = [
  "GettingStartedPage.tsx",
  "ApiComponentsPage.tsx",
  "ApiHooksPage.tsx",
  "ApiTypesPage.tsx",
  "ApiUtilitiesPage.tsx",
  "LearnNavigationApiPage.tsx",
  "LearnNestedRoutesPage.tsx",
  "LearnRscPage.tsx",
  "LearnSsrPage.tsx",
  "LearnTransitionsPage.tsx",
  "LearnTypeSafetyPage.tsx",
];

function extractMetadata(content: string) {
  // Extract title from <h1>...</h1> or <h2>...</h2>
  const titleMatch = content.match(/<h[12]>(.*?)<\/h[12]>/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract description from <p className="page-intro">
  const introMatch = content.match(
    /<p className="page-intro">\s*([\s\S]*?)\s*<\/p>/,
  );
  let description = "";
  if (introMatch) {
    // Strip JSX tags and normalize whitespace
    description = introMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\{"\s*"\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return { title, description };
}

function categorize(fileName: string): string | null {
  if (fileName.startsWith("Api")) return "API Reference";
  if (fileName.startsWith("Learn")) return "Learn";
  return null;
}

function generateIndex(
  docs: {
    fileName: string;
    title: string;
    description: string;
  }[],
) {
  const lines = [
    "# FUNSTACK Router Documentation",
    "",
    "## Available Documentation",
    "",
  ];

  const groups = new Map<string | null, typeof docs>();
  for (const doc of docs) {
    const group = categorize(doc.fileName);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(doc);
  }

  // Root-level docs first
  for (const doc of groups.get(null) ?? []) {
    const entry = doc.description
      ? `- [${doc.title}](./${doc.fileName}) - ${doc.description}`
      : `- [${doc.title}](./${doc.fileName})`;
    lines.push(entry);
  }

  // Then each group as a section
  for (const [group, groupDocs] of groups) {
    if (group === null) continue;
    lines.push("", `### ${group}`, "");
    for (const doc of groupDocs) {
      const entry = doc.description
        ? `- [${doc.title}](./${doc.fileName}) - ${doc.description}`
        : `- [${doc.title}](./${doc.fileName})`;
      lines.push(entry);
    }
  }

  return lines.join("\n") + "\n";
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Copy all content pages as-is
  await Promise.all(
    CONTENT_PAGES.map(async (fileName) => {
      const source = path.join(DOCS_PAGES_DIR, fileName);
      const output = path.join(OUTPUT_DIR, fileName);
      await fs.copyFile(source, output);
    }),
  );

  // Extract metadata and generate index
  const docs = await Promise.all(
    CONTENT_PAGES.map(async (fileName) => {
      const content = await fs.readFile(
        path.join(DOCS_PAGES_DIR, fileName),
        "utf-8",
      );
      const { title, description } = extractMetadata(content);
      return {
        fileName,
        title: title || fileName.replace(/Page\.tsx$/, ""),
        description,
      };
    }),
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, "index.md"),
    generateIndex(docs),
    "utf-8",
  );

  console.log(`Generated ${docs.length} doc files + index.md in ${OUTPUT_DIR}`);
}

main();

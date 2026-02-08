import { codeToHtml } from "shiki";

interface CodeBlockProps {
  children: string;
  language?: "tsx" | "typescript" | "bash" | "json";
}

export async function CodeBlock({
  children,
  language = "tsx",
}: CodeBlockProps) {
  const code = children.trim();
  const html = await codeToHtml(code, {
    lang: language,
    theme: "github-dark",
  });

  return (
    <div
      className="code-block-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

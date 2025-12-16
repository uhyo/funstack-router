import { Highlight, type PrismTheme } from "prism-react-renderer";

const theme: PrismTheme = {
  plain: {
    color: "#e0e0e0",
    backgroundColor: "var(--color-bg-code)",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#6a737d", fontStyle: "italic" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "#a5d6ff" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "#8b949e" },
    },
    {
      types: [
        "entity",
        "url",
        "symbol",
        "number",
        "boolean",
        "variable",
        "constant",
        "property",
        "regex",
        "inserted",
      ],
      style: { color: "#79c0ff" },
    },
    {
      types: ["atrule", "keyword", "attr-name"],
      style: { color: "#ff79c6" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "#d2a8ff" },
    },
    {
      types: ["function-variable"],
      style: { color: "#d2a8ff" },
    },
    {
      types: ["selector", "class-name"],
      style: { color: "#7ee787" },
    },
    {
      types: ["builtin", "char"],
      style: { color: "#ffa657" },
    },
  ],
};

interface CodeBlockProps {
  children: string;
  language?: "tsx" | "typescript" | "bash" | "json";
}

export function CodeBlock({ children, language = "tsx" }: CodeBlockProps) {
  const code = children.trim();

  return (
    <Highlight theme={theme} code={code} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre className="code-block" style={style}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

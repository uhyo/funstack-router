"use client";

import { useLocation } from "@funstack/router";
import { docsNavSections, isNavGroup, type NavItem } from "../navigation.js";

function DocsNavLink({
  item,
  currentPath,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate?: () => void;
}) {
  if (item.external) {
    return (
      <li>
        <a
          href={item.path}
          className="docs-nav-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
        >
          {item.label} <span aria-hidden="true">↗</span>
        </a>
      </li>
    );
  }
  const isActive = currentPath === item.path;
  return (
    <li>
      <a
        href={item.path}
        className={`docs-nav-link ${isActive ? "active" : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
      >
        {item.label}
      </a>
    </li>
  );
}

// Lists all documentation pages grouped by section, highlighting the current page.
export function DocsNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname: currentPath } = useLocation();

  return (
    <>
      {docsNavSections.map((section) => (
        <div key={section.label} className="docs-nav-section">
          <p className="docs-nav-section-label">{section.label}</p>
          <ul className="docs-nav-list">
            {section.items.map((entry) =>
              isNavGroup(entry) ? (
                <li key={entry.label} className="docs-nav-group">
                  <span className="docs-nav-group-label">{entry.label}</span>
                  <ul className="docs-nav-list">
                    {entry.items.map((item) => (
                      <DocsNavLink
                        key={item.path}
                        item={item}
                        currentPath={currentPath}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </ul>
                </li>
              ) : (
                <DocsNavLink
                  key={entry.path}
                  item={entry}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </ul>
        </div>
      ))}
    </>
  );
}

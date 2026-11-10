"use client";

import React, { useState } from "react";
import { Icon } from "./Icon";
import { copyToClipboard } from "@/lib/utils";

export interface CodeItem {
  label: string;
  lang?: string;
  code: string;
}

export interface CodeBlockProps {
  items: CodeItem[];
  compact?: boolean;
}

const strPattern = '"(?:\\\\.|[^"\\\\])*\'|\'(?:\\\\.|[^\'\\\\])*\'';
const syntaxRules: Record<string, [string, string][]> = {
  bash: [
    ["c", "#.*"],
    ["s", strPattern],
    ["f", "\\s--?[A-Za-z][\\w-]*"],
    ["k", "\\bcurl\\b"],
    ["n", "\\b\\d+\\b"],
  ],
  js: [
    ["c", "\\/\\/.*"],
    ["s", strPattern + "|`(?:\\\\.|[^`\\\\])*`"],
    [
      "k",
      "\\b(?:const|let|var|await|async|new|for|of|if|else|return|function|true|false|null|undefined)\\b",
    ],
    ["n", "\\b\\d[\\d_]*\\b"],
    ["fn", "\\b[A-Za-z_$][\\w$]*(?=\\()"],
  ],
  py: [
    ["c", "#.*"],
    ["s", strPattern],
    [
      "k",
      "\\b(?:import|from|with|as|def|return|for|in|if|else|True|False|None)\\b",
    ],
    ["n", "\\b\\d+\\b"],
    ["fn", "\\b[A-Za-z_]\\w*(?=\\()"],
  ],
  json: [
    ["key", '"(?:\\\\.|[^"\\\\])*"(?=\\s*:)'],
    ["s", '"(?:\\\\.|[^"\\\\])*"'],
    ["k", "\\b(?:true|false|null)\\b"],
    ["n", "-?\\b\\d+(?:\\.\\d+)?\\b"],
  ],
};

const compiledRules: Record<string, { rules: [string, string][]; re: RegExp }> =
  {};
for (const [lang, rules] of Object.entries(syntaxRules)) {
  compiledRules[lang] = {
    rules,
    re: new RegExp(rules.map(([, pat]) => `(${pat})`).join("|"), "g"),
  };
}

function highlightCode(code: string, lang: string): React.ReactNode[] {
  const spec = compiledRules[lang];
  if (!spec) return [code];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  spec.re.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = spec.re.exec(code)) !== null) {
    if (match[0] === "") {
      spec.re.lastIndex++;
      continue;
    }
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }
    const ruleIdx = match.findIndex((val, idx) => idx > 0 && val !== undefined) - 1;
    const ruleType = spec.rules[ruleIdx]?.[0] || "k";
    nodes.push(
      <span key={match.index} className={`tk-${ruleType}`}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }
  return nodes;
}

export function CodeBlock({ items, compact = false }: CodeBlockProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = items[Math.min(activeTab, items.length - 1)];
  if (!current) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(current.code, "Snippet Copied");
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const detectedLang =
    current.lang ||
    (current.label.toLowerCase() === "curl"
      ? "bash"
      : current.label.toLowerCase() === "javascript"
      ? "js"
      : current.label.toLowerCase() === "python"
      ? "py"
      : current.code.trim().startsWith("{")
      ? "json"
      : "bash");

  return (
    <figure className={`code${compact ? " compact" : ""}`}>
      <div className="code-bar">
        {items.length > 1 ? (
          <div className="code-tabs" role="tablist" aria-label="Language">
            {items.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-selected={idx === activeTab}
                className={idx === activeTab ? "on" : ""}
                onClick={() => setActiveTab(idx)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="code-title">{current.label}</span>
        )}
        <button
          type="button"
          className="code-copy"
          onClick={handleCopy}
          aria-label="Copy Code"
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{highlightCode(current.code, detectedLang)}</code>
      </pre>
    </figure>
  );
}

export default CodeBlock;

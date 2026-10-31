import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
        <span className="font-mono lowercase select-none">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-[13px] leading-relaxed text-zinc-100 m-0">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  return (
    <div className="text-[15px] leading-[1.68] text-zinc-800 dark:text-zinc-100 break-words space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-5 mb-2 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-5 mb-2 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-4 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-[1.7] last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 marker:text-zinc-400 dark:marker:text-zinc-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 marker:text-zinc-500 dark:marker:text-zinc-400 tabular-nums">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 leading-[1.65]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-xl p-4 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 dark:text-teal-400 underline underline-offset-3 decoration-teal-700/40 dark:decoration-teal-400/40 hover:decoration-current transition-colors"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-zinc-200 dark:border-zinc-800" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left border-collapse text-sm tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold">{children}</th>,
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-zinc-200/70 dark:border-zinc-800/70 text-zinc-700 dark:text-zinc-300">
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const rawText = String(children).replace(/\n$/, "");
            const isBlock = Boolean(match) || rawText.includes("\n");

            if (isBlock) {
              return <CodeBlock language={match ? match[1] : ""} value={rawText} />;
            }

            return (
              <code
                className="font-mono text-[13px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-teal-800 dark:text-teal-300 border border-zinc-200/70 dark:border-zinc-700/70"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 align-middle bg-teal-600 dark:bg-teal-400 animate-pulse rounded-xs"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

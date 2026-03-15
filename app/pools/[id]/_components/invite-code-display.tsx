"use client";

import { useState } from "react";

export default function InviteCodeDisplay({ code }: { code: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleCopyLink() {
    const link = `${window.location.origin}/pools/join/${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="flex items-stretch gap-2">
      <button
        onClick={handleCopyCode}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono tracking-wider transition-all cursor-pointer bg-card border border-card-border text-foreground hover:border-card-border-hover"
      >
        {code}
        <span className={`text-xs ${copiedCode ? "text-green-400" : "text-muted"}`}>
          {copiedCode ? "Copied!" : "Copy"}
        </span>
      </button>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all cursor-pointer bg-card border border-card-border text-foreground hover:border-card-border-hover"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className={`text-xs ${copiedLink ? "text-green-400" : "text-muted"}`}>
          {copiedLink ? "Link copied!" : "Copy invite link"}
        </span>
      </button>
    </div>
  );
}

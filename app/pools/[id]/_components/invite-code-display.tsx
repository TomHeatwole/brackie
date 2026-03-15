"use client";

import { useState } from "react";

export default function InviteCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono tracking-wider transition-colors cursor-pointer"
      style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530", color: "#e7e5e4" }}
    >
      {code}
      <span className="text-xs text-stone-500">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Resaltado de JSON ligero (sin dependencias). */
function highlight(json: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of json.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(json.slice(last, idx));
    const t = m[0];
    let cls = "text-[#f5b97a]"; // número
    if (t.startsWith('"')) cls = m[2] ? "text-[#b3a4ff]" : "text-[#7ee2b8]";
    else if (t === "true" || t === "false") cls = "text-[#5cc8ff]";
    else if (t === "null") cls = "text-white/40";
    out.push(
      <span key={i++} className={cls}>
        {t}
      </span>,
    );
    last = idx + t.length;
  }
  out.push(json.slice(last));
  return out;
}

export function JsonViewer({ value, testId }: { value: unknown; testId?: string }) {
  const text = useMemo(() => JSON.stringify(value, null, 2) ?? "null", [value]);
  const nodes = useMemo(() => highlight(text), [text]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        aria-label="Copiar JSON"
        className="absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-md border border-white/10 bg-black/60 text-white/60 hover:text-white"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
      <pre
        data-testid={testId}
        tabIndex={0}
        aria-label="Respuesta JSON"
        className="max-h-[420px] overflow-auto rounded-xl border border-white/[0.07] bg-black/50 p-4 font-mono text-[12px] leading-relaxed text-white/70"
      >
        <code>{nodes}</code>
      </pre>
    </div>
  );
}

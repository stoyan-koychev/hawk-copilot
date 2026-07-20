"use client";

import { useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type HarnessEvent = { kind: string; label: string };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<HarnessEvent[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const streaming = useRef("");

  const send = async () => {
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    streaming.current = "";
    const history = messages; // prior turns, before this question
    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setEvents([]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, history }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (; ;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame.startsWith("data: ")) continue;
        const ev = JSON.parse(frame.slice(6));
        if (ev.kind === "text") {
          streaming.current += ev.delta;
          setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: streaming.current }]);
        } else if (ev.kind === "tool") {
          setEvents((e) => [...e, { kind: "tool", label: `${ev.tool}(${JSON.stringify(ev.args)})` }]);
        } else if (ev.kind === "llm") {
          setEvents((e) => [...e, { kind: "llm", label: `llm call - in ${ev.usage.in} / out ${ev.usage.out} tokens` }]);
        } else if (ev.kind === "done") {
          const reply = ev.error ? `Something went wrong: ${ev.error}` : ev.reply;
          setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: reply }]);
        }
      }
    }
    setBusy(false);
  };

  const linkify = (text: string) =>
    text.split(/(https?:\/\/\S+)/g).map((part, i) =>
      part.startsWith("http") ? (
        <a key={i} href={part} target="_blank" className="text-blue-600 underline break-all">{part}</a>
      ) : (
        part
      ),
    );

  return (
    <main className="mx-auto grid h-screen max-w-5xl grid-cols-[1fr_280px] gap-4 p-4">
      <div className="flex flex-col overflow-hidden rounded-xl border">
        <header className="border-b px-4 py-2 font-semibold">Hawk Copilot - grounded in Payhawk docs</header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}>
                {m.content ? linkify(m.content) : "-¦"}
              </div>
            </div>
          ))}
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything about Payhawk"
            disabled={busy}
          />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy}>
            Send
          </button>
        </form>
      </div>
      <aside className="overflow-y-auto rounded-xl border p-3 text-xs">
        <h2 className="mb-2 font-semibold">Harness - live</h2>
        {events.length === 0 && <p className="text-gray-400">tool calls and model usage appear here as a turn runs</p>}
        {events.map((e, i) => (
          <div key={i} className="mb-1 rounded bg-gray-50 p-2 font-mono">{e.label}</div>
        ))}
      </aside>
    </main>
  );
}

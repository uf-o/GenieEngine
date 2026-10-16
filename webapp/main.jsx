import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const starterPrompt = "Create a tiny neon arcade game where I move a ship with the arrow keys and dodge glowing asteroids.";

function extractHtml(text) {
  const match = text.match(/```html\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(text)) return text.trim();
  return "";
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Welcome to GenieEngine Web. Describe a game, ask for mechanics, or request a self-contained HTML prototype. This web edition is an AI Studio-compatible prototype of the original desktop engine."
  }]);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [prototype, setPrototype] = useState("");
  const [error, setError] = useState("");
  const [apiReady, setApiReady] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef(null);
  const promptRef = useRef(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((d) => setApiReady(d.geminiConfigured)).catch(() => setApiReady(false));
  }, []);

  async function sendMessage(text = prompt) {
    const clean = text.trim();
    if (!clean || busy) return;
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setPrompt("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: clean, history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The AI request failed.");
      const html = extractHtml(data.answer);
      if (html) {
        setPrototype(html);
        setActiveTab("preview");
      }
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, hasPrototype: Boolean(html) }]);
    } catch (err) {
      setError(err.message || "Could not reach the AI service.");
      setMessages((prev) => [...prev, { role: "assistant", text: "I couldn't complete that request. Check the error shown below, then try again." }]);
    } finally {
      setBusy(false);
      promptRef.current?.focus();
    }
  }

  function runPrototype() {
    if (iframeRef.current) iframeRef.current.srcdoc = prototype;
  }

  useEffect(() => {
    if (prototype && activeTab === "preview" && iframeRef.current) iframeRef.current.srcdoc = prototype;
  }, [prototype, activeTab]);

  function downloadPrototype() {
    if (!prototype) return;
    const blob = new Blob([prototype], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "genieengine-prototype.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">G</div><div><strong>GenieEngine</strong><small>WEB STUDIO</small></div></div>
        <button className="new-project" onClick={() => { setMessages([{ role: "assistant", text: "New session started. Describe the game you want to make." }]); setPrototype(""); setError(""); }}>＋ <span>New project</span></button>
        <div className="side-label">WORKSPACE</div>
        <div className="side-item selected"><span>◈</span> Game studio</div>
        <div className="side-item"><span>⌘</span> AI assistant <i>LIVE</i></div>
        <div className="side-item"><span>▧</span> Prototype preview</div>
        <div className="sidebar-bottom"><div className="status-dot" /> {apiReady === null ? "Checking AI connection…" : apiReady ? "Gemini connected" : "Gemini key not configured"}<small>Web adaptation · Godot desktop preserved</small></div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>Game studio</b></div><div className="top-actions"><span className="model-pill"><span className="status-dot" /> Gemini 2.5 Flash</span><button className="export-btn" onClick={downloadPrototype} disabled={!prototype}>↓ Export HTML</button></div></header>
        <div className="workspace">
          <section className="chat-panel">
            <div className="panel-heading"><div><span className="eyebrow">YOUR CREATIVE COPILOT</span><h1>Build something<br/><em>playable.</em></h1></div><div className="sparkle">✳</div></div>
            <p className="intro">Describe your idea. Plan mechanics with AI, then ask for a playable browser prototype.</p>
            <div className="suggestions">
              <button onClick={() => sendMessage("Design a 2D platformer set in a bioluminescent alien forest. Propose the core loop, controls and three levels.")}>✦ <span>Design a game</span></button>
              <button onClick={() => sendMessage(starterPrompt)}>▹ <span>Make an arcade prototype</span></button>
              <button onClick={() => sendMessage("Give me a concise game design document for a cozy exploration game with mysterious floating islands.")}>▤ <span>Write a game concept</span></button>
            </div>
            <div className="conversation" aria-live="polite">
              {messages.map((message, index) => <div className={`message ${message.role}`} key={index}>
                <div className="avatar">{message.role === "assistant" ? "G" : "Y"}</div>
                <div className="message-body"><div className="message-role">{message.role === "assistant" ? "GENIE ASSISTANT" : "YOU"}</div><div className="message-text">{message.text}</div>{message.hasPrototype && <button className="inline-action" onClick={() => setActiveTab("preview")}>Open playable preview ↗</button>}</div>
              </div>)}
              {busy && <div className="message assistant"><div className="avatar">G</div><div className="message-body"><div className="message-role">GENIE ASSISTANT</div><div className="typing"><span/><span/><span/> Thinking through your idea…</div></div></div>}
            </div>
            {error && <div className="error-box">{error}</div>}
            <form className="composer" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
              <textarea ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Describe your game idea…" rows={2} disabled={busy}/>
              <div className="composer-footer"><span>↵ Send · Shift + ↵ new line</span><button type="submit" disabled={busy || !prompt.trim()}>{busy ? "Working…" : "Generate"} <span>↗</span></button></div>
            </form>
            <p className="disclaimer">AI output may contain errors. Review generated code before using it.</p>
          </section>

          <section className="preview-panel">
            <div className="preview-header"><div><span className="eyebrow">LIVE WORKSPACE</span><h2>Game preview</h2></div><div className="window-controls"><span/><span/><span/></div></div>
            <div className="preview-toolbar"><div className="tabs"><button className={activeTab === "preview" ? "active" : ""} onClick={() => setActiveTab("preview")}>◉ Preview</button><button className={activeTab === "code" ? "active" : ""} onClick={() => { setActiveTab("code"); setShowCode(true); }}>{"</>"} Code</button></div><button className="run-btn" onClick={() => { if (prototype) { setActiveTab("preview"); runPrototype(); } }} disabled={!prototype}>▶ Run</button></div>
            {activeTab === "preview" ? <div className="game-frame">
              {prototype ? <iframe ref={iframeRef} title="Generated game preview" sandbox="allow-scripts" /> : <div className="empty-preview"><div className="orbit"><div className="planet">✦</div><span className="orbit-ring ring-one"/><span className="orbit-ring ring-two"/></div><h3>Your next world starts here.</h3><p>Generate a playable prototype and it will appear in this space.</p><button onClick={() => sendMessage(starterPrompt)}>Create a starter game <span>↗</span></button><div className="frame-grid"/></div>}
              <div className="frame-footer"><span><i className={prototype ? "status-dot" : "muted-dot"}/>{prototype ? "Prototype loaded" : "Waiting for a prototype"}</span><span>WEB RUNTIME · SANDBOXED</span></div>
            </div> : <div className="code-view"><div className="code-top"><span>genieengine-prototype.html</span><button onClick={downloadPrototype}>Download ↧</button></div><pre>{prototype || "Your generated HTML prototype will appear here."}</pre></div>}
            <div className="preview-bottom"><div><span className="bottom-icon">⌘</span><div><b>Prototype sandbox</b><small>Isolated browser preview</small></div></div><span className="safe-pill">● SAFE MODE</span></div>
          </section>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

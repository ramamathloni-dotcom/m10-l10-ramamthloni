// web/pages/rag.tsx

import { useState } from "react";
import { RAGResponse } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RagPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setResult(null);
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/rag/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, k: 4 }),
      });
      
      if (!res.ok) {
        if (res.status === 422) setError("Validation error: check your input length.");
        else if (res.status === 503) setError("The backend is starting up — please try again in a moment.");
        else setError(`Error: ${res.status}`);
        setLoading(false);
        return;
      }
      
      const data: RAGResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }

  const renderCitedAnswer = (answer: string) => {
    const parts = answer.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      if (/^\[\d+\]$/.test(part)) {
        return (
          <span key={index} data-testid="citation-marker" style={{ background: "#e2e8f0", padding: "0 4px", margin: "0 2px", borderRadius: "4px", fontSize: "0.9em" }}>
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <main>
      <h1>RAG — Cited Answer</h1>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a recipe question..."
      />
      <button onClick={submit} disabled={!question || loading}>
        {loading ? "Asking..." : "Ask"}
      </button>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
          <p>{renderCitedAnswer(result.answer)}</p>
          
          <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#555" }}>
            <strong>Confidence:</strong> {result.confidence.toFixed(3)}
          </div>
          
          {result.citations.length > 0 && (
            <ul style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
              {result.citations.map((c, idx) => (
                <li key={idx}>Chunk ID: {c.chunk_id} — Score: {c.score.toFixed(3)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
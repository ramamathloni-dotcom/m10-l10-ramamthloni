// web/pages/extract.tsx

import { useState } from "react";
import { ExtractResponse } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ExtractPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setResult(null);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) {
        if (res.status === 422) setError("Validation error: check your text input.");
        else if (res.status === 503) setError("The backend is starting up — please try again in a moment.");
        else setError(`Error: ${res.status}`);
        return;
      }
      
      const data: ExtractResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError("Could not reach the backend.");
    }
  }

  return (
    <main>
      <h1>Extract — Named Entity Recognition</h1>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={submit} disabled={!text}>Extract</button>
      
      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <ul style={{ marginTop: "1rem" }}>
          {result.entities.map((ent, idx) => (
            <li key={idx} style={{ marginBottom: "0.5rem" }}>
              <span data-testid="entity-span" style={{ background: "#f0f0f0", padding: "4px" }}>
                {ent.text} ({ent.label})
              </span>
              <small style={{ marginLeft: "8px", color: "gray" }}>[{ent.start} - {ent.end}]</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
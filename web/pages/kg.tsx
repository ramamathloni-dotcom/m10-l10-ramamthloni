// web/pages/kg.tsx

import { useState } from "react";
import { KGResponse } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function KgPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KGResponse | null>(null);
  const [error, setError] = useState<{ message: string; patterns?: string[] } | null>(null);

  async function submit() {
    setResult(null);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/kg/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 422 && data.detail && data.detail.reason === "unsupported_question") {
          setError({ message: "Unsupported question format.", patterns: data.detail.supported_patterns });
        } else if (res.status === 503) {
          setError({ message: "The backend is starting up — please try again in a moment." });
        } else {
          setError({ message: `Error: ${res.status}` });
        }
        return;
      }
      
      const data: KGResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError({ message: "Could not reach the backend." });
    }
  }

  return (
    <main>
      <h1>Knowledge Graph — Recipe Query</h1>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Find Sichuan recipes"
      />
      <button onClick={submit} disabled={!question}>Ask</button>
      
      {error && (
        <div style={{ color: "red", marginTop: "1rem" }}>
          <p>{error.message}</p>
          {error.patterns && (
            <ul>
              {error.patterns.map((p, idx) => <li key={idx}>{p}</li>)}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          <pre style={{ background: "#eee", padding: "1rem" }}>{result.cypher}</pre>
          <p>Count: {result.count}</p>
          <table border={1} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {result.rows.length > 0 && Object.keys(result.rows[0]).map((key) => (
                  <th key={key} style={{ padding: "8px" }}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, idx) => (
                <tr key={idx} data-testid="kg-row">
                  {Object.values(row).map((val: any, jdx) => (
                    <td key={jdx} style={{ padding: "8px" }}>{JSON.stringify(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
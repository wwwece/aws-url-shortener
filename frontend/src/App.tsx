import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL; // set on build time from CDK output

export default function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/shorten`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data.shortUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1>URL Shortener</h1>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        style={{ width: "100%", padding: 8 }}
      />
      <button onClick={submit} disabled={loading || !url} style={{ marginTop: 8 }}>
        {loading ? "..." : "Shorten"}
      </button>
      {result && <p>Short URL: <a href={`https://${result}`}>{result}</a></p>}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/healthz`;
    fetch(url)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Health Check</h1>
      <p>API: {process.env.NEXT_PUBLIC_API_URL}</p>
      {error && <pre style={{ color: 'crimson' }}>{error}</pre>}
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>Loading…</p>}
    </main>
  );
}


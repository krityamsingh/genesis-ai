// useFeatureFlags.js — Read feature flags from API (Phase 5)
import { useEffect, useState } from "react";
export function useFeatureFlags(token) {
  const [flags, setFlags] = useState(null);
  const [loading, setLoading] = useState(false);
  const reload = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch("/api/v1/flags/",{headers:{Authorization:`Bearer ${token}`}});
      setFlags(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [token]);
  return { flags, loading, reload };
}

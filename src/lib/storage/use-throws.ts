import { useCallback, useEffect, useState } from "react";
import type { StoredThrow } from "@/lib/analysis/types";
import { deleteThrow, listThrows } from "./db";

export function useThrows() {
  const [throws, setThrows] = useState<StoredThrow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listThrows();
      setThrows(rows);
      setError(null);
    } catch {
      setError("Could not read saved throws on this device.");
      setThrows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteThrow(id);
      await refresh();
    },
    [refresh],
  );

  return { throws, error, refresh, remove };
}

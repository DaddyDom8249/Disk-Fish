import { create } from "zustand";
import type { AnalysisRecord, AnalysisState } from "./types";

interface SessionState {
  state: AnalysisState;
  progress: number;
  label: string;
  errorId: string | null;
  errorMessage: string | null;
  result: AnalysisRecord | null;
  setProgress: (state: AnalysisState, progress: number, label: string) => void;
  setResult: (record: AnalysisRecord) => void;
  setFailed: (message: string, errorId: string) => void;
  reset: () => void;
}

export const useAnalysisSession = create<SessionState>((set) => ({
  state: "idle",
  progress: 0,
  label: "",
  errorId: null,
  errorMessage: null,
  result: null,
  setProgress: (state, progress, label) => set({ state, progress, label, errorId: null, errorMessage: null }),
  setResult: (record) => set({ state: "complete", progress: 100, label: "Analysis complete", result: record }),
  setFailed: (message, errorId) =>
    set({ state: "failed", progress: 100, label: message, errorMessage: message, errorId }),
  reset: () =>
    set({
      state: "idle",
      progress: 0,
      label: "",
      errorId: null,
      errorMessage: null,
      result: null,
    }),
}));

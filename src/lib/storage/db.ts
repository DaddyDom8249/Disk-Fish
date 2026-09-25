import type { AnalysisRecord, StoredThrow } from "@/lib/analysis/types";

const DB_NAME = "pro-throw-analyzer";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("throws")) {
        db.createObjectStore("throws", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

function toStored(record: AnalysisRecord): StoredThrow {
  return {
    id: record.id,
    createdAt: record.createdAt,
    isDemo: record.isDemo,
    throwTypeId: record.throwType.id,
    throwTypeCode: record.throwType.code,
    throwTypeLabel: record.throwType.label,
    hand: record.throwType.hand,
    family: record.throwType.family,
    footwork: record.throwType.footwork,
    intent: record.throwType.intent,
    cameraAngle: record.cameraAngle,
    disc: record.disc,
    distanceMeters: record.distanceMeters,
    notes: record.notes,
    primaryFocusTitle: record.coaching.primaryFocus?.title ?? null,
    overallConfidence: record.overallConfidence,
    qualityGrade: record.quality.grade,
    analysis: record,
    hasVideo: false,
  };
}

export async function saveThrow(record: AnalysisRecord, video?: Blob | null): Promise<StoredThrow> {
  const stored = toStored(record);
  stored.hasVideo = !!video && video.size > 0;
  const db = await openDb();
  const tx = db.transaction(["throws", "videos"], "readwrite");
  tx.objectStore("throws").put(stored);
  if (video && video.size > 0) {
    tx.objectStore("videos").put({ id: record.id, blob: video, type: video.type, createdAt: record.createdAt });
  }
  await txDone(tx);
  db.close();
  return stored;
}

export async function listThrows(): Promise<StoredThrow[]> {
  const db = await openDb();
  const tx = db.transaction("throws", "readonly");
  const req = tx.objectStore("throws").getAll();
  const rows = await new Promise<StoredThrow[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as StoredThrow[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getThrow(id: string): Promise<StoredThrow | null> {
  const db = await openDb();
  const tx = db.transaction("throws", "readonly");
  const req = tx.objectStore("throws").get(id);
  const row = await new Promise<StoredThrow | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as StoredThrow | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return row ?? null;
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction("videos", "readonly");
  const req = tx.objectStore("videos").get(id);
  const row = await new Promise<{ blob: Blob } | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as { blob: Blob } | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return row?.blob ?? null;
}

export async function deleteThrow(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["throws", "videos"], "readwrite");
  tx.objectStore("throws").delete(id);
  tx.objectStore("videos").delete(id);
  await txDone(tx);
  db.close();
}

export async function deleteAllUserData(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["throws", "videos"], "readwrite");
  tx.objectStore("throws").clear();
  tx.objectStore("videos").clear();
  await txDone(tx);
  db.close();
}

export function exportThrowJson(record: AnalysisRecord): string {
  const copy = {
    ...record,
    frames: record.frames.map((f) => ({
      frame: f.frame,
      timestampMs: f.timestampMs,
      personCount: f.personCount,
      landmarks: f.landmarks,
    })),
  };
  return JSON.stringify(copy, null, 2);
}

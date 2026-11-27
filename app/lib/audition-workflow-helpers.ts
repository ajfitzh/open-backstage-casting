// app/lib/audition-workflow-helpers.ts
// Pure Node-ESM-compatible helpers for multi-judge audition scoring, consensus,
// slot sorting, conflict parsing, and browser video recording MIME selection.

export type CallbackVote = "strong_yes" | "yes" | "maybe" | "no";
export type AuditionRound = "audition" | "callback";
export type VideoKind = "audition" | "dance" | "callback";

export interface JudgeBallot {
  id?: number;
  judgeEmail: string;
  judgeName: string;
  judgeRole: string;
  round: AuditionRound;
  vocalScore: number | null;
  actingScore: number | null;
  danceScore: number | null;
  stagePresenceScore: number | null;
  callbackVote: CallbackVote | null;
  suggestedRoles: string;
  notes: string;
  updatedAt?: string;
}

export interface PanelConsensus {
  judgeCount: number;
  avgVocal: number;
  avgActing: number;
  avgDance: number;
  avgPresence: number;
  overallAverage: number;
  votes: {
    strongYes: number;
    yes: number;
    maybe: number;
    no: number;
  };
  suggestedRoles: string[];
}

export function clampScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  const clamped = Math.min(5, Math.max(0.5, num));
  return Math.round(clamped * 2) / 2;
}

export function normalizeCallbackVote(value: unknown): CallbackVote | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (clean === "strong_yes" || clean === "strongyes") return "strong_yes";
  if (clean === "yes") return "yes";
  if (clean === "maybe") return "maybe";
  if (clean === "no") return "no";
  return null;
}

export function normalizeRound(value: unknown): AuditionRound {
  return value === "callback" ? "callback" : "audition";
}

export function normalizeVideoKind(value: unknown): VideoKind {
  if (value === "dance") return "dance";
  if (value === "callback") return "callback";
  return "audition";
}

function avgNonNull(values: Array<number | null | undefined>): number {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function computePanelConsensus(
  ballots: JudgeBallot[],
  round?: AuditionRound
): PanelConsensus {
  const filtered = round ? ballots.filter((b) => b.round === round) : ballots;

  const avgVocal = avgNonNull(filtered.map((b) => b.vocalScore));
  const avgActing = avgNonNull(filtered.map((b) => b.actingScore));
  const avgDance = avgNonNull(filtered.map((b) => b.danceScore));
  const avgPresence = avgNonNull(filtered.map((b) => b.stagePresenceScore));

  const categoryAvgs = [avgVocal, avgActing, avgDance, avgPresence].filter((v) => v > 0);
  const overallAverage =
    categoryAvgs.length > 0
      ? Math.round((categoryAvgs.reduce((a, b) => a + b, 0) / categoryAvgs.length) * 10) / 10
      : 0;

  const votes = { strongYes: 0, yes: 0, maybe: 0, no: 0 };
  const roleSet = new Set<string>();

  for (const b of filtered) {
    if (b.callbackVote === "strong_yes") votes.strongYes += 1;
    else if (b.callbackVote === "yes") votes.yes += 1;
    else if (b.callbackVote === "maybe") votes.maybe += 1;
    else if (b.callbackVote === "no") votes.no += 1;

    if (b.suggestedRoles) {
      for (const role of b.suggestedRoles.split(/[,;\n]/)) {
        const trimmed = role.trim();
        if (trimmed) roleSet.add(trimmed);
      }
    }
  }

  return {
    judgeCount: filtered.length,
    avgVocal,
    avgActing,
    avgDance,
    avgPresence,
    overallAverage,
    votes,
    suggestedRoles: Array.from(roleSet),
  };
}

export function parseFormConflictsFromNotes(adminNotes: string | null | undefined): string[] {
  if (!adminNotes) return [];
  const match = adminNotes.match(/Conflicts:\s*\n([\s\S]*?)(?:\n\nExtra Info:|$)/i);
  if (!match) return [];
  const block = match[1].trim();
  if (!block || block.toLowerCase() === "none") return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase() !== "none");
}

const DAY_ORDER: Record<string, number> = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

function slotSortKey(label: string): [number, number, string] {
  const lower = label.trim().toLowerCase();
  if (lower === "walk-in" || lower === "walk-in results") return [98, 0, lower];
  if (lower === "tbd" || lower === "unscheduled") return [99, 0, lower];

  let dayRank = 50;
  for (const [key, rank] of Object.entries(DAY_ORDER)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(lower)) {
      dayRank = rank;
      break;
    }
  }

  let minutes = 9999;
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0;
    const meridiem = (timeMatch[3] || "").toLowerCase();
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    minutes = hours * 60 + mins;
  }

  return [dayRank, minutes, lower];
}

export function sortAuditionSlots(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const ka = slotSortKey(a);
    const kb = slotSortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2].localeCompare(kb[2]);
  });
}

export function pickPreferredVideoMimeType(
  isTypeSupported: (mime: string) => boolean
): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    try {
      if (isTypeSupported(c.mimeType)) return c;
    } catch {
      // Ignore unsupported check errors
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

export function inferUploadMimeType(filename: string, rawFileType: string): string {
  const cleanType = (rawFileType || "").split(";")[0].trim().toLowerCase();
  if (cleanType) return cleanType;

  const ext = (filename.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "wav":
      return "audio/wav";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    default:
      return "";
  }
}

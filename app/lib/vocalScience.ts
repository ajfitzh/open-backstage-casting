// app/lib/vocalScience.ts

export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const NOTE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 
  'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 
  'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
};

// --- AUDIO PROCESSING MATH ---

export function getMidiNote(frequency: number): number {
  return Math.round(12 * (Math.log(frequency / 440) / Math.log(2))) + 69;
}

export function getNoteString(midiNote: number): string {
  return NOTE_STRINGS[midiNote % 12] + (Math.floor(midiNote / 12) - 1);
}

export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // Noise gate

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.subarray(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
  }

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// --- DATA PARSING & CLASSIFICATION ---

export function noteToInt(noteStr: string): number | null {
  if (!noteStr) return null;
  const match = noteStr.toUpperCase().trim().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return null;
  
  const note = match[1];
  const octave = parseInt(match[2], 10);
  
  return NOTE_MAP[note] + (octave + 1) * 12;
}

export function calculateBestVoiceType(lowestMidi: number, highestMidi: number): string {
    if (lowestMidi === 999 || highestMidi === 0) return "Unknown";

    const CHORAL_RANGES = {
        Soprano: { min: 60, max: 81 }, 
        Alto:    { min: 53, max: 74 },  
        Tenor:   { min: 48, max: 67 },  
        Baritone:{ min: 43, max: 64 }, 
        Bass:    { min: 36, max: 60 },  
    };

    let bestMatch = "Flexible";
    let maxOverlap = 0;

    for (const [type, bounds] of Object.entries(CHORAL_RANGES)) {
        const overlapMin = Math.max(lowestMidi, bounds.min);
        const overlapMax = Math.min(highestMidi, bounds.max);
        const overlap = Math.max(0, overlapMax - overlapMin);

        if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestMatch = type;
        }
    }

    if (maxOverlap === 0) bestMatch = "Unsure";
    return bestMatch;
}

// Backwards compatibility for parsing existing string ranges
export function classifyVoiceType(lowStr: string, highStr: string): string {
  const low = noteToInt(lowStr) || 0;
  const high = noteToInt(highStr) || 0;
  if (!low || !high) return "Unknown";
  return calculateBestVoiceType(low, high);
}

export function parseRangeString(rangeStr: string) {
  if (!rangeStr || typeof rangeStr !== 'string' || !rangeStr.includes('-')) {
    return { raw: rangeStr || "", lowNote: null, highNote: null, lowInt: 0, highInt: 0, voiceType: "Unknown" };
  }

  const [lowStr, highStr] = rangeStr.split('-').map(s => s.trim());
  return {
    raw: rangeStr,
    lowNote: lowStr,
    highNote: highStr,
    lowInt: noteToInt(lowStr) || 0,
    highInt: noteToInt(highStr) || 0,
    voiceType: classifyVoiceType(lowStr, highStr)
  };
}
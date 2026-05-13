// app/lib/vocalScience.ts

const NOTE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 
  'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 
  'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
};

// 1. Converts "C4" into integer 60 (Standard MIDI number)
export function noteToInt(noteStr: string): number | null {
  if (!noteStr) return null;
  const match = noteStr.toUpperCase().trim().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return null;
  
  const note = match[1];
  const octave = parseInt(match[2], 10);
  
  return NOTE_MAP[note] + (octave + 1) * 12;
}

// 2. Looks at the integers and gives you the "Quick Look" Voice Type
export function classifyVoiceType(lowStr: string, highStr: string): string {
  const low = noteToInt(lowStr);
  const high = noteToInt(highStr);
  
  if (!low || !high) return "Unknown";

  // Approximate standard ranges in MIDI values
  // Middle C (C4) = 60
  if (low >= 60 && high >= 84) return "Soprano";       // C4 - C6
  if (low >= 55 && high >= 81) return "Mezzo-Soprano"; // G3 - A5
  if (low >= 53 && high >= 77) return "Alto";          // F3 - F5
  if (low >= 48 && high >= 72) return "Tenor";         // C3 - C5
  if (low >= 43 && high >= 67) return "Baritone";      // G2 - G4
  if (low >= 40 && high >= 64) return "Bass";          // E2 - E4

  return "Flexible"; // If it spans weirdly, they are a flexible singer
}

// 3. The master parser for your schema
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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMidiNote,
  getNoteString,
  noteToInt,
  calculateBestVoiceType,
  classifyVoiceType,
  parseRangeString,
  autoCorrelate,
} from '../../app/lib/vocalScience.ts';

describe('vocalScience pitch & MIDI conversions', () => {
  it('converts standard frequencies to MIDI notes', () => {
    assert.equal(getMidiNote(440), 69); // A4
    assert.equal(getMidiNote(261.63), 60); // Middle C (C4)
    assert.equal(getMidiNote(880), 81); // A5
  });

  it('formats MIDI notes back into note strings', () => {
    assert.equal(getNoteString(60), 'C4');
    assert.equal(getNoteString(69), 'A4');
    assert.equal(getNoteString(61), 'C#4');
  });

  it('parses note strings including sharps, flats, whitespace, and lowercase', () => {
    assert.equal(noteToInt('C4'), 60);
    assert.equal(noteToInt('a4'), 69);
    assert.equal(noteToInt('  Bb3 '), 58);
    assert.equal(noteToInt('F#4'), 66);
    assert.equal(noteToInt('Gb4'), 66);
  });

  it('returns null for invalid or empty note strings', () => {
    assert.equal(noteToInt(''), null);
    assert.equal(noteToInt('H4'), null);
    assert.equal(noteToInt('C'), null);
  });
});

describe('vocalScience voice classification & range parsing', () => {
  it('classifies standard choral vocal ranges accurately', () => {
    assert.equal(classifyVoiceType('C4', 'A5'), 'Soprano');
    assert.equal(classifyVoiceType('F3', 'D5'), 'Alto');
    assert.equal(classifyVoiceType('C3', 'G4'), 'Tenor');
    assert.equal(classifyVoiceType('G2', 'E4'), 'Baritone');
    assert.equal(classifyVoiceType('C2', 'C4'), 'Bass');
  });

  it('handles sentinel and out-of-range MIDI bounds safely', () => {
    assert.equal(calculateBestVoiceType(999, 0), 'Unknown');
    assert.equal(calculateBestVoiceType(100, 110), 'Unsure');
  });

  it('parses valid and malformed range strings', () => {
    const parsed = parseRangeString('C4 - A5');
    assert.deepEqual(parsed, {
      raw: 'C4 - A5',
      lowNote: 'C4',
      highNote: 'A5',
      lowInt: 60,
      highInt: 81,
      voiceType: 'Soprano',
    });

    const invalid = parseRangeString('');
    assert.equal(invalid.voiceType, 'Unknown');
    assert.equal(invalid.lowNote, null);
    assert.equal(invalid.highNote, null);
  });
});

describe('autoCorrelate', () => {
  it('returns -1 for silence below the noise gate', () => {
    const silence = new Float32Array(2048);
    assert.equal(autoCorrelate(silence, 44100), -1);
  });

  it('detects a clean 440 Hz sine wave within 2 Hz', () => {
    const sampleRate = 44100;
    const freq = 440;
    const buf = new Float32Array(2048);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }

    const detected = autoCorrelate(buf, sampleRate);
    assert.ok(Math.abs(detected - freq) < 2, `Expected ~${freq} Hz, got ${detected}`);
  });
});

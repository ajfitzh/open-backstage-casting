import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampScore,
  computePanelConsensus,
  inferUploadMimeType,
  normalizeCallbackVote,
  parseFormConflictsFromNotes,
  pickPreferredVideoMimeType,
  sortAuditionSlots,
  type JudgeBallot,
} from "../../app/lib/audition-workflow-helpers.ts";
import { validateUploadRequest } from "../../app/lib/upload-validation.ts";

describe("Multi-judge audition & callback workflow helpers", () => {
  it("computes panel consensus accurately across 5 judges and separates rounds", () => {
    const ballots: JudgeBallot[] = [
      {
        judgeEmail: "director@theater.org",
        judgeName: "Sarah",
        judgeRole: "Director",
        round: "audition",
        vocalScore: 4,
        actingScore: 5,
        danceScore: null,
        stagePresenceScore: 5,
        callbackVote: "strong_yes",
        suggestedRoles: "Belle, Mrs. Potts",
        notes: "Commanding stage presence.",
      },
      {
        judgeEmail: "music@theater.org",
        judgeName: "Marcus",
        judgeRole: "Music",
        round: "audition",
        vocalScore: 5,
        actingScore: 4,
        danceScore: null,
        stagePresenceScore: 4,
        callbackVote: "strong_yes",
        suggestedRoles: "Belle",
        notes: "Effortless belt.",
      },
      {
        judgeEmail: "choreo@theater.org",
        judgeName: "Elena",
        judgeRole: "Choreographer",
        round: "audition",
        vocalScore: null,
        actingScore: null,
        danceScore: 4,
        stagePresenceScore: 4,
        callbackVote: "yes",
        suggestedRoles: "Featured Dancer",
        notes: "Clean turns.",
      },
      {
        judgeEmail: "guest@theater.org",
        judgeName: "Devon",
        judgeRole: "Drop-In",
        round: "audition",
        vocalScore: 3,
        actingScore: 3,
        danceScore: 3,
        stagePresenceScore: 3,
        callbackVote: "maybe",
        suggestedRoles: "",
        notes: "Solid overall.",
      },
      {
        judgeEmail: "director@theater.org",
        judgeName: "Sarah",
        judgeRole: "Director",
        round: "callback",
        vocalScore: 5,
        actingScore: 5,
        danceScore: 4,
        stagePresenceScore: 5,
        callbackVote: "strong_yes",
        suggestedRoles: "Belle",
        notes: "Nailed the chemistry read.",
      },
    ];

    const auditionConsensus = computePanelConsensus(ballots, "audition");
    assert.equal(auditionConsensus.judgeCount, 4);
    assert.equal(auditionConsensus.avgVocal, 4);
    assert.equal(auditionConsensus.avgActing, 4);
    assert.equal(auditionConsensus.avgDance, 3.5);
    assert.equal(auditionConsensus.avgPresence, 4);
    assert.equal(auditionConsensus.overallAverage, 3.9);
    assert.deepEqual(auditionConsensus.votes, {
      strongYes: 2,
      yes: 1,
      maybe: 1,
      no: 0,
    });
    assert.deepEqual(auditionConsensus.suggestedRoles, [
      "Belle",
      "Mrs. Potts",
      "Featured Dancer",
    ]);

    const callbackConsensus = computePanelConsensus(ballots, "callback");
    assert.equal(callbackConsensus.judgeCount, 1);
    assert.equal(callbackConsensus.avgActing, 5);
    assert.equal(callbackConsensus.overallAverage, 4.8);
  });

  it("clamps scores and normalizes callback votes safely", () => {
    assert.equal(clampScore(0), null);
    assert.equal(clampScore(-2), null);
    assert.equal(clampScore(6.5), 5);
    assert.equal(clampScore(3.4), 3.5);
    assert.equal(clampScore(null), null);

    assert.equal(normalizeCallbackVote("Strong Yes"), "strong_yes");
    assert.equal(normalizeCallbackVote("YES"), "yes");
    assert.equal(normalizeCallbackVote("maybe"), "maybe");
    assert.equal(normalizeCallbackVote("no"), "no");
    assert.equal(normalizeCallbackVote("invalid"), null);
  });

  it("parses structured schedule conflicts from registration admin notes", () => {
    const notes = `Conflicts:\n2026-04-10: partial (Soccer game until 6pm)\n2026-04-17: unavailable (Family trip)\n\nExtra Info:\nGrade: 10`;
    assert.deepEqual(parseFormConflictsFromNotes(notes), [
      "2026-04-10: partial (Soccer game until 6pm)",
      "2026-04-17: unavailable (Family trip)",
    ]);
    assert.deepEqual(parseFormConflictsFromNotes("Conflicts:\nNone\n\nExtra Info:\nGrade: 8"), []);
  });

  it("sorts standardized audition slots chronologically by day and time", () => {
    const unsorted = [
      "WALK-IN",
      "Saturday 10:00 AM",
      "Friday 6:30 PM",
      "Friday 5:00 PM",
      "Unscheduled",
      "Saturday 9:00 AM",
    ];
    assert.deepEqual(sortAuditionSlots(unsorted), [
      "Friday 5:00 PM",
      "Friday 6:30 PM",
      "Saturday 9:00 AM",
      "Saturday 10:00 AM",
      "WALK-IN",
      "Unscheduled",
    ]);
  });

  it("selects Safari MP4 or Chrome WebM recording codecs and strips codec params in upload validation", () => {
    const safari = pickPreferredVideoMimeType((m) => m.startsWith("video/mp4"));
    assert.equal(safari.extension, "mp4");

    const chrome = pickPreferredVideoMimeType((m) => m.includes("vp8,opus"));
    assert.equal(chrome.extension, "webm");

    assert.equal(inferUploadMimeType("tape.MOV", ""), "video/quicktime");
    assert.equal(inferUploadMimeType("clip.webm", "video/webm;codecs=vp8,opus"), "video/webm");

    const validated = validateUploadRequest("audition-clip.webm", "video/webm;codecs=vp8,opus");
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.equal(validated.contentType, "video/webm");
    }
  });
});

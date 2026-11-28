// tests/unit/committee-matcher.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  solveOptimalCommitteeAssignments,
  findSwapSuggestions,
  computeHouseholdFulfillment,
  type CommitteeVolunteer,
} from "../../app/lib/committee-matcher.ts";

function makeVol(
  id: number,
  name: string,
  overrides: Partial<CommitteeVolunteer> = {}
): CommitteeVolunteer {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: "",
    studentName: `Kid ${id}`,
    preShow1: null,
    preShow2: null,
    preShow3: null,
    showWeek1: null,
    showWeek2: null,
    showWeek3: null,
    chairInterest: [],
    assignedPreShow: null,
    assignedShowWeek: null,
    isChair: false,
    ...overrides,
  };
}

describe("solveOptimalCommitteeAssignments", () => {
  it("beats greedy ordering by finding optimal swaps so everyone gets a top choice", () => {
    const volunteers = [
      makeVol(1, "Alice", { preShow1: "Costumes", preShow2: "Props" }),
      makeVol(2, "Bob", { preShow1: "Costumes" }),
    ];

    const report = solveOptimalCommitteeAssignments(
      volunteers,
      "Pre-Show",
      ["Costumes", "Props"],
      { Costumes: 1, Props: 1 },
      {},
      {},
      { unassignedOnly: true }
    );

    assert.equal(report.unassigned, 0);
    assert.equal(report.assignments[2], "Costumes");
    assert.equal(report.assignments[1], "Props");
    assert.equal(report.first, 1);
    assert.equal(report.second, 1);
  });

  it("handles Anywhere Needed wildcards and continuity bonus across phases", () => {
    const volunteers = [
      makeVol(1, "Flexible Parent", { preShow1: "Anywhere Needed" }),
      makeVol(2, "Continuity Parent", {
        preShow1: "Costumes",
        preShow2: "Props",
        assignedShowWeek: "Props",
      }),
      makeVol(3, "Costumes Fan", { preShow1: "Costumes" }),
    ];

    const report = solveOptimalCommitteeAssignments(
      volunteers,
      "Pre-Show",
      ["Costumes", "Props", "Sets"],
      { Costumes: 1, Props: 1, Sets: 1 },
      {},
      {},
      { unassignedOnly: true, continuityBonus: true }
    );

    assert.equal(report.unassigned, 0);
    assert.equal(report.assignments[3], "Costumes");
    assert.equal(report.assignments[2], "Props");
    assert.equal(report.assignments[1], "Sets");
    assert.equal(report.continuityMatches, 1);
    assert.equal(report.flexible, 1);
  });

  it("prioritizes chair interest and suggests chairs for committees without one", () => {
    const volunteers = [
      makeVol(1, "Regular Parent", { preShow1: "Tech" }),
      makeVol(2, "Chair Volunteer", { preShow1: "Tech", chairInterest: ["Tech"] }),
    ];

    const report = solveOptimalCommitteeAssignments(
      volunteers,
      "Pre-Show",
      ["Tech"],
      { Tech: 1 },
      {},
      {},
      { prioritizeChairInterest: true }
    );

    assert.equal(report.assignments[2], "Tech");
    assert.equal(report.suggestedChairs[2], true);
    assert.equal(report.chairMatches, 1);
  });

  it("preserves locked chairs when re-optimizing the whole board", () => {
    const volunteers = [
      makeVol(1, "Pinned Chair", { preShow1: "Sets" }),
      makeVol(2, "Swappable Parent", { preShow1: "Props", preShow2: "Costumes" }),
    ];

    const report = solveOptimalCommitteeAssignments(
      volunteers,
      "Pre-Show",
      ["Costumes", "Props", "Sets"],
      { Costumes: 1, Props: 1, Sets: 1 },
      { 1: "Costumes", 2: "Sets" },
      { 1: true },
      { unassignedOnly: false }
    );

    assert.equal(report.assignments[1], "Costumes");
    assert.equal(report.assignments[2], "Props");
  });
});

describe("findSwapSuggestions", () => {
  it("recommends unassigned and overstaffed volunteers who want the target committee", () => {
    const volunteers = [
      makeVol(1, "Unassigned Fan", { preShow1: "Tech" }),
      makeVol(2, "Overstaffed Fan", { preShow1: "Costumes", preShow2: "Tech" }),
      makeVol(3, "Locked Chair", { preShow1: "Tech" }),
    ];

    const suggestions = findSwapSuggestions(
      "Tech",
      volunteers,
      "Pre-Show",
      { 2: "Costumes", 3: "Costumes" },
      { 3: true },
      { Costumes: 1, Tech: 2 }
    );

    assert.deepEqual(
      suggestions.map((s) => s.volunteer.id),
      [1, 2]
    );
    assert.equal(suggestions[0].choiceRank, 1);
    assert.equal(suggestions[1].fromOverstaffed, true);
  });
});

describe("computeHouseholdFulfillment", () => {
  it("groups siblings and split-parent households into a single fulfilled family", () => {
    const volunteers = [
      makeVol(1, "Sarah Smith", {
        studentName: "Emma Smith",
        familyKey: "fam:10",
      }),
      makeVol(2, "Mark Smith", {
        studentName: "Noah Smith",
        familyKey: "fam:10",
      }),
      makeVol(3, "Jane Doe", {
        studentName: "Lily Doe",
        familyKey: "fam:20",
      }),
    ];

    const students = [
      { id: 100, name: "Emma Smith" },
      { id: 101, name: "Noah Smith" },
      { id: 102, name: "Lily Doe" },
      { id: 103, name: "Sam Missing" },
    ];

    const rows = computeHouseholdFulfillment(
      volunteers,
      students,
      { 1: "Costumes", 3: "Props" },
      { 2: "Security" },
      { 1: true }
    );

    const smith = rows.find((r) => r.familyKey === "fam:10")!;
    assert.deepEqual(smith.students, ["Emma Smith", "Noah Smith"]);
    assert.equal(smith.status, "fulfilled");
    assert.equal(smith.isSplitAcrossParents, true);

    const doe = rows.find((r) => r.familyKey === "fam:20")!;
    assert.equal(doe.status, "partial");

    const missing = rows.find((r) => r.students.includes("Sam Missing"))!;
    assert.equal(missing.status, "missing");
  });
});

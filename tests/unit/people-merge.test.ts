import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  arePeopleSafeToAutoMerge,
  buildMergedPersonFields,
  canonicalNicknameKey,
  normalizePersonName,
  pickWinningPerson,
} from "../../app/lib/people-merge-helpers.ts";

describe("people-merge-helpers", () => {
  it("normalizes names and maps common nickname variants cleanly", () => {
    assert.equal(normalizePersonName("  José  García-López "), "jose garcia lopez");
    assert.equal(canonicalNicknameKey("Pam King"), "pamela king");
    assert.equal(canonicalNicknameKey("Pamela King"), "pamela king");
    assert.equal(canonicalNicknameKey("Mike Smith"), "michael smith");
    assert.equal(canonicalNicknameKey("Liz Johnson"), "elizabeth johnson");
  });

  it("refuses to auto-merge records with different DOBs (protects parent/child & same-name students)", () => {
    assert.equal(
      arePeopleSafeToAutoMerge(
        { email: "a@example.com", dateOfBirth: "1976-12-06" },
        { email: "a@example.com", dateOfBirth: "2005-05-28" }
      ),
      false
    );
    // Safe when one DOB is missing and email matches or is missing
    assert.equal(
      arePeopleSafeToAutoMerge(
        { email: "austin@cytfred.org", dateOfBirth: "1990-07-30" },
        { email: null, dateOfBirth: null }
      ),
      true
    );
    // Safe when emails differ ONLY if both share exact same DOB
    assert.equal(
      arePeopleSafeToAutoMerge(
        { email: "personal@gmail.com", dateOfBirth: "1980-03-02" },
        { email: "work@cytfred.org", dateOfBirth: "1980-03-02" }
      ),
      true
    );
    assert.equal(
      arePeopleSafeToAutoMerge(
        { email: "person1@gmail.com", dateOfBirth: null },
        { email: "person2@gmail.com", dateOfBirth: null }
      ),
      false
    );
  });

  it("picks the best winning profile (password > admin/staff > credits > completeness > lowest id)", () => {
    const winner = pickWinningPerson([
      {
        id: 4916,
        firstName: "Austin",
        lastName: "Fitzhugh",
        fullName: "Austin Fitzhugh",
        email: null,
        dateOfBirth: null,
        roles: ["Student"],
        creditsCount: 9,
      },
      {
        id: 1,
        firstName: "Austin",
        lastName: "Fitzhugh",
        fullName: "Austin Fitzhugh",
        email: "austin@cytfred.org",
        dateOfBirth: "1990-07-30",
        roles: ["Admin"],
        hasPassword: true,
        creditsCount: 6,
      },
    ]);
    assert.equal(winner.id, 1);
  });

  it("merges scalar fields non-destructively, unions roles, and preserves secondaryEmail", () => {
    const updates = buildMergedPersonFields(
      {
        id: 3837,
        firstName: "Pam",
        lastName: "King",
        fullName: "Pam King",
        email: "pam@cytfred.org",
        secondaryEmail: null,
        dateOfBirth: "1980-03-02",
        headshotUrl: null,
        roles: ["Staff"],
      },
      {
        id: 5339,
        firstName: "Pamela",
        lastName: "King",
        fullName: "Pamela King",
        email: "pamelaking@gmail.com",
        dateOfBirth: null,
        headshotUrl: "https://example.com/pam.jpg",
        roles: ["Contractor", "Staff"],
      }
    );

    assert.equal(updates.email, undefined); // winner email preserved
    assert.equal(updates.secondaryEmail, "pamelaking@gmail.com");
    assert.equal(updates.headshotUrl, "https://example.com/pam.jpg");
    assert.deepEqual(updates.roles, ["Staff", "Contractor"]);
  });
});

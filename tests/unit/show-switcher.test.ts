import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyShowBucket,
  filterShowsByQuery,
  resolveShowSwitchPath,
  type SwitcherShow,
} from "../../app/lib/show-switcher-helpers.ts";

describe("show-switcher-helpers", () => {
  it("resolveShowSwitchPath swaps production ID while preserving tenant prefix and sub-route", () => {
    assert.equal(
      resolveShowSwitchPath("/cyt/production/5/schedule", "cyt", 42),
      "/cyt/production/42/schedule"
    );
    assert.equal(
      resolveShowSwitchPath("/cyt/production/5/team", "cyt", 19),
      "/cyt/production/19/team"
    );
    assert.equal(
      resolveShowSwitchPath("/cyt/production/5/casting", "cyt", 8),
      "/cyt/production/8/casting"
    );
  });

  it("resolveShowSwitchPath normalizes middleware-rewritten paths without tenant prefix", () => {
    assert.equal(
      resolveShowSwitchPath("/production/5/roster", "cyt", 101),
      "/cyt/production/101/roster"
    );
    assert.equal(resolveShowSwitchPath("/box-office", "cyt", 101), "/cyt/box-office");
  });

  it("resolveShowSwitchPath keeps dashboard and global routes intact with tenant prefix", () => {
    assert.equal(resolveShowSwitchPath("/", "cyt", 42), "/cyt");
    assert.equal(resolveShowSwitchPath("/cyt", "cyt", 42), "/cyt");
    assert.equal(resolveShowSwitchPath("/cyt/reports", "cyt", 42), "/cyt/reports");
    assert.equal(resolveShowSwitchPath("/cyt/production", "cyt", 42), "/cyt/production");
  });

  it("classifyShowBucket classifies active, upcoming, and archived shows", () => {
    assert.equal(classifyShowBucket({ isActive: true, status: "Active" }), "active");
    assert.equal(classifyShowBucket({ isActive: false, status: "Upcoming" }), "upcoming");
    assert.equal(classifyShowBucket({ isActive: false, status: "Pre-Production" }), "upcoming");
    assert.equal(classifyShowBucket({ isActive: false, status: "Archived" }), "archive");
    assert.equal(classifyShowBucket({ isActive: false, status: "Completed" }), "archive");
  });

  it("filterShowsByQuery filters across title, season, location, and status", () => {
    const shows: SwitcherShow[] = [
      { id: 1, title: "Newsies", season: "2024-2025", status: "Active", location: "Mainstage" },
      { id: 2, title: "The Lion King Jr.", season: "2022-2023", status: "Archived", location: "Fredericksburg" },
      { id: 3, title: "Annie", season: "2025-2026", status: "Upcoming", location: "Mainstage" },
    ];

    assert.deepEqual(filterShowsByQuery(shows, "lion").map((s) => s.id), [2]);
    assert.deepEqual(filterShowsByQuery(shows, "2022").map((s) => s.id), [2]);
    assert.deepEqual(filterShowsByQuery(shows, "fredericksburg").map((s) => s.id), [2]);
    assert.deepEqual(filterShowsByQuery(shows, "upcoming").map((s) => s.id), [3]);
    assert.equal(filterShowsByQuery(shows, "   ").length, 3);
  });
});

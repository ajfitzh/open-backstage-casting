import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyShowBucket,
  filterShowsByQuery,
  resolveShowSwitchPath,
  sortShowsBySession,
  type SwitcherShow,
} from "../../app/lib/show-switcher-helpers.ts";

describe("show-switcher-helpers", () => {
  it("resolveShowSwitchPath preserves subdomain paths without prepending tenant", () => {
    assert.equal(resolveShowSwitchPath("/", "cytfred", 42), "/");
    assert.equal(
      resolveShowSwitchPath("/production/5/schedule", "cytfred", 42),
      "/production/42/schedule"
    );
    assert.equal(
      resolveShowSwitchPath("/production/5/team", "cytfred", 19),
      "/production/19/team"
    );
    assert.equal(resolveShowSwitchPath("/box-office", "cytfred", 101), "/box-office");
    assert.equal(resolveShowSwitchPath("/reports", "cytfred", 42), "/reports");
  });

  it("resolveShowSwitchPath preserves tenant prefix when already present in path-based URLs", () => {
    assert.equal(resolveShowSwitchPath("/cyt/production/5/schedule", "cyt", 42), "/cyt/production/42/schedule");
    assert.equal(resolveShowSwitchPath("/cyt/production/5/casting", "cyt", 8), "/cyt/production/8/casting");
    assert.equal(resolveShowSwitchPath("/cyt", "cyt", 42), "/cyt");
    assert.equal(resolveShowSwitchPath("/cyt/reports", "cyt", 42), "/cyt/reports");
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

  it("sortShowsBySession orders Fall -> Winter -> Spring -> Summer chronologically", () => {
    const shows: SwitcherShow[] = [
      { id: 1, title: "Into the Woods", productionSession: "Summer" },
      { id: 2, title: "Wizard of Oz", productionSession: "Fall" },
      { id: 3, title: "Little Mermaid", productionSession: "Spring" },
      { id: 4, title: "High School Musical", productionSession: "Winter" },
      { id: 5, title: "Lion King Kids", productionSession: "Winter" },
    ];
    assert.deepEqual(
      sortShowsBySession(shows).map((s) => `${s.productionSession}:${s.title}`),
      [
        "Fall:Wizard of Oz",
        "Winter:High School Musical",
        "Winter:Lion King Kids",
        "Spring:Little Mermaid",
        "Summer:Into the Woods",
      ]
    );
  });
});

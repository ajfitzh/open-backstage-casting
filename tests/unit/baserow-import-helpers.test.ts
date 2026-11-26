import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractAllLinkIds,
  extractBool,
  extractFileUrl,
  extractFileUrls,
  extractFirstLinkId,
  extractInt,
  extractMultiSelect,
  extractNumber,
  extractSelect,
  extractText,
  mapLinkedId,
  mapLinkedIds,
  normalizeEmail,
  safeParseJson,
  slugifyOrgName,
} from "../../scripts/baserow-import-helpers.ts";

describe("Baserow-to-Postgres import helpers", () => {
  it("extracts text, select, and multi-select values cleanly", () => {
    assert.equal(extractText("  Hello  "), "Hello");
    assert.equal(extractText("   "), null);
    assert.equal(extractText({ id: 1, value: "Main Stage" }), "Main Stage");
    assert.equal(extractText([{ value: "Alice" }, { value: "Bob" }]), "Alice, Bob");

    assert.equal(extractSelect({ id: 4, value: "Active" }), "Active");
    assert.equal(extractSelect(null), null);

    assert.deepEqual(
      extractMultiSelect([{ id: 1, value: "Admin" }, { id: 2, value: "Director" }]),
      ["Admin", "Director"]
    );
  });

  it("extracts numeric, integer, and boolean fields safely", () => {
    assert.equal(extractNumber("125.50"), 125.5);
    assert.equal(extractNumber("$45.00"), 45);
    assert.equal(extractNumber("not-a-num"), null);
    assert.equal(extractInt("64.7"), 65);

    assert.equal(extractBool(true), true);
    assert.equal(extractBool("true"), true);
    assert.equal(extractBool("Yes"), true);
    assert.equal(extractBool(false), false);
    assert.equal(extractBool(null), false);
  });

  it("extracts file URLs and maps relational Baserow link_row IDs", () => {
    assert.equal(
      extractFileUrl([{ url: "https://cdn.example.com/photo.jpg", name: "photo.jpg" }]),
      "https://cdn.example.com/photo.jpg"
    );
    assert.deepEqual(
      extractFileUrls([
        { url: "https://cdn.example.com/r1.pdf" },
        { url: "https://cdn.example.com/r2.pdf" },
      ]),
      ["https://cdn.example.com/r1.pdf", "https://cdn.example.com/r2.pdf"]
    );

    const idMap = new Map<number, number>([
      [101, 1],
      [202, 2],
    ]);
    assert.equal(extractFirstLinkId([{ id: 101, value: "Show A" }]), 101);
    assert.deepEqual(extractAllLinkIds([{ id: 101 }, { id: 202 }]), [101, 202]);
    assert.equal(mapLinkedId([{ id: 202 }], idMap), 2);
    assert.equal(mapLinkedId([{ id: 999 }], idMap), null);
    assert.deepEqual(mapLinkedIds([{ id: 101 }, { id: 999 }, { id: 202 }], idMap), [1, 2]);
  });

  it("parses JSON safely, normalizes emails, and slugifies org names", () => {
    assert.deepEqual(safeParseJson('[{"name":"Mom"}]', []), [{ name: "Mom" }]);
    assert.deepEqual(safeParseJson("broken json", []), []);
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
    assert.equal(slugifyOrgName("CYT Fredericksburg!"), "cyt-fredericksburg");
  });
});

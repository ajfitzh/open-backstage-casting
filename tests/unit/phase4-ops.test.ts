// tests/unit/phase4-ops.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatAuditActionLabel,
  parseCommitteeList,
  sanitizeHexColor,
  sanitizeProvisionSlug,
} from "../../app/lib/phase4-helpers.ts";

describe("Phase 4 Multi-Tenant Provisioning, Branding & Audit Helpers", () => {
  it("sanitizes requested organization subdomain slugs safely", () => {
    assert.equal(sanitizeProvisionSlug("  CYT Richmond! 2026 "), "cyt-richmond-2026");
    assert.equal(sanitizeProvisionSlug("---My Theater---"), "my-theater");
  });

  it("validates hex brand colors and falls back safely", () => {
    assert.equal(sanitizeHexColor("#FF5733"), "#ff5733");
    assert.equal(sanitizeHexColor("not-a-color", "#2563eb"), "#2563eb");
  });

  it("parses committee template lists from comma/newline strings or arrays", () => {
    assert.deepEqual(parseCommitteeList("Costumes, Props & Set\nTech"), [
      "Costumes",
      "Props & Set",
      "Tech",
    ]);
    assert.ok(parseCommitteeList(null).length >= 4);
  });

  it("formats audit action slugs into readable titles", () => {
    assert.equal(formatAuditActionLabel("branding_updated"), "Branding Updated");
    assert.equal(formatAuditActionLabel("org_provisioned"), "Org Provisioned");
  });
});

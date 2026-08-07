import { describe, it, expect } from "vitest";
import { POLICIES, rejectionRate, minimumCampaignSize, binomialTail } from "../src/core/gate";

describe("promotion gates — the false-rejection result", () => {
  it("computes a binomial tail correctly", () => {
    expect(binomialTail(0, 10)).toBeCloseTo(1, 6);
    expect(binomialTail(10, 10)).toBeCloseTo(1 / 1024, 6);
    expect(binomialTail(5, 10)).toBeCloseTo(0.623, 2);
  });

  it("rolls back a clone almost always under overlap rules, and worse with more data", () => {
    const r = POLICIES.overlap!.rule;
    const at30 = rejectionRate(r, 30);
    const at140 = rejectionRate(r, 140);
    expect(at30).toBeGreaterThan(0.99);
    expect(at140).toBeGreaterThanOrEqual(at30 - 0.005);
    expect(at140).toBeGreaterThan(0.99);
  });

  it("fails just as badly under a superiority test, for the opposite reason", () => {
    const r = POLICIES.superiority!.rule;
    expect(rejectionRate(r, 30)).toBeGreaterThan(0.9);
    expect(rejectionRate(r, 200)).toBeGreaterThan(0.9); // flat in n
  });

  it("passes A/A under non-inferiority, and improves with n", () => {
    const r = POLICIES.nonInferiority!.rule;
    const at30 = rejectionRate(r, 30);
    const at140 = rejectionRate(r, 140);
    expect(at30).toBeLessThan(0.1);
    expect(at140).toBeLessThan(at30);
    expect(at140).toBeLessThan(0.01);
  });

  it("detects real harm beyond the margin", () => {
    const r = POLICIES.nonInferiority!.rule;
    expect(rejectionRate(r, 30, -800)).toBeGreaterThan(0.9);
  });

  it("reports a minimum campaign size only for the gate that has one", () => {
    expect(minimumCampaignSize(POLICIES.overlap!.rule)).toBeNull();
    expect(minimumCampaignSize(POLICIES.superiority!.rule)).toBeNull();
    expect(minimumCampaignSize(POLICIES.nonInferiority!.rule)).toBeLessThanOrEqual(60);
  });
});

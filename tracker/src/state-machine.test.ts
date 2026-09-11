import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextEvent } from "./state-machine";

describe("activity state machine", () => {
  it("emits IDLE when idle time crosses the threshold", () => {
    assert.equal(
      nextEvent("ACTIVE", {
        locked: false,
        idleSeconds: 300,
        idleThresholdSeconds: 300,
      }),
      "IDLE",
    );
  });

  it("does not repeat the same IDLE event", () => {
    assert.equal(
      nextEvent("IDLE", {
        locked: false,
        idleSeconds: 400,
        idleThresholdSeconds: 300,
      }),
      null,
    );
  });

  it("emits LOCKED when Windows is locked", () => {
    assert.equal(
      nextEvent("ACTIVE", {
        locked: true,
        idleSeconds: 0,
        idleThresholdSeconds: 300,
      }),
      "LOCKED",
    );
  });

  it("emits UNLOCKED when leaving the locked state", () => {
    assert.equal(
      nextEvent("LOCKED", {
        locked: false,
        idleSeconds: 0,
        idleThresholdSeconds: 300,
      }),
      "UNLOCKED",
    );
  });
});

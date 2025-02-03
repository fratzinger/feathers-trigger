import assert from "assert";
import type { Subscription } from "../src";
import { trigger, changesById } from "../src";

describe("index", function () {
  it("exports all members", function () {
    assert.ok(trigger, "exports trigger hook");
    assert.ok(changesById, "exports changesById hook");

    const sub: Subscription = {
      method: "create",
      service: "tests",
      action: () => {},
    };
    assert.ok(sub, "exports types");
  });
});

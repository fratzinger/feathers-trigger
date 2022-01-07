import assert from "assert";
import { 
  trigger,
  changesById,
  Subscription,
  makeActionServiceCall
} from "../src/index";

describe("index", function() {
  it("exports all members", function() {
    assert.ok(trigger, "exports trigger hook");
    assert.ok(changesById, "exports changesById hook");

    assert.ok(makeActionServiceCall, "exports action");
    
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const sub: Subscription = { method: "create", service: "tests", action: () => {} };
    assert.ok(sub, "exports types");
  });
});
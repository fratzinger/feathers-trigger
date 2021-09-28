import assert from "assert";
import { 
  trigger,
  changesById,
  Subscription
} from "../src/index";

describe("index", function() {
  it("exports all members", function() {
    assert.ok(trigger, "exports trigger hook");
    assert.ok(changesById, "exports changesById hook");
    
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const sub: Subscription = { method: "create", service: "tests", callAction: () => {} };
    assert.ok(sub, "exports types");
  });
});
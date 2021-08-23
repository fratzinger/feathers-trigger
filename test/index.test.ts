import assert from "assert";
import { 
  notify,
  changesById,
  Subscription
} from "../lib/index";

describe("index", function() {
  it("exports all members", function() {
    assert.ok(notify, "exports notify hook");
    assert.ok(changesById, "exports changesById hook");
    
    const sub: Subscription = { method: "create", service: "tests" };
    assert.ok(sub, "exports types");
  });
});
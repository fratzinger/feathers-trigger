import assert from "assert";
import transformMustache from "../../lib/utils/transformMustache";

describe("transformMustache", function() {
  it("doesn't change item", function() {
    const transformed = transformMustache({
      test: true
    }, { test: false });
    assert.deepStrictEqual(transformed, { test: true }, "item hasn't changed");
  });

  it("changes item", function() {
    const transformed = transformMustache({
      test: "{{ test }}"
    }, { test: true });
    assert.deepStrictEqual(transformed, { test: true }, "item changed");
  });

  it("changes array items", function() {
    const transformed = transformMustache({
      items: [{ test: "{{ test }}" }]
    }, { test: true });
    assert.deepStrictEqual(transformed, { items: [ { test: true }] }, "array item changed");
  });

  it("changes nested property with dot.notation", function() {
    const transformed = transformMustache({
      test: "{{ test.test.test }}"
    }, { test: { test: { test: true } } });
    assert.deepStrictEqual(transformed, { test: true }, "array item changed");
  });
});
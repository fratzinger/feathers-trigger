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

  it("doesn't change item with mustache not starting", function() {
    const transformed = transformMustache({
      test: "hi {{ test }}"
    }, { test: false });
    assert.deepStrictEqual(transformed, { test: "hi {{ test }}" }, "item hasn't changed");
  });

  it("doesn't change item with mustache not ending", function() {
    const transformed = transformMustache({
      test: "{{ test }} hi"
    }, { test: false });
    assert.deepStrictEqual(transformed, { test: "{{ test }} hi" }, "item hasn't changed");
  });

  it("works with no whitespaces", function() {
    const transformed = transformMustache({
      test: "{{test}}"
    }, { test: true });
    assert.deepStrictEqual(transformed, { test: true }, "item has changed");
  });

  it("doesn't work with leading and trailing whitespaces", function() {
    const transformed = transformMustache({
      test: "   {{ test }}    "
    }, { test: true });
    assert.deepStrictEqual(transformed, { test: "   {{ test }}    " }, "item hasn't changed");
  });

  it("works with multiple whitespaces", function() {
    const transformed = transformMustache({
      test: "{{   test      }}"
    }, { test: true });
    assert.deepStrictEqual(transformed, { test: true }, "item has changed");
  });

  it("doesn't work with nested mustache", function() {
    const transformed = transformMustache({
      test: "{{ {{ test }} }}"
    }, { test: true });
    assert.deepStrictEqual(transformed, { test: "{{ {{ test }} }}" }, "item hasn't changed");
  });

  it("doesn't change if view isn't existent", function() {
    const transformed = transformMustache({
      test: "{{ test }}"
    }, { test2: true });
    assert.deepStrictEqual(transformed, { test: "{{ test }}" }, "item hasn't changed");
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
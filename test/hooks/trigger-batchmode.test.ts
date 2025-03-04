import { mock } from "./base-mock";

describe("trigger batch mode", () => {
  it("create: triggers on multi create without condition in batch mode", async function () {
    let cbCount = 0;
    let changeCount = 0;
    const { service } = mock("create", {
      method: "create",
      service: "tests",
      batchAction: (changes) => {
        cbCount++;
        changeCount = changes.length;
      },
    });

    await service.create([
      { id: 0, test: true },
      { id: 1, test: true },
      { id: 2, test: true },
    ]);
    assert.strictEqual(cbCount, 1, "action cb was called only a single time");
    assert.strictEqual(
      changeCount,
      3,
      "action cb was called with three change tuples",
    );
  });

  it("patch: triggers on multi create with conditions in batch mode", async function () {
    let cbCount = 0;
    let changeCount = 0;
    const { service } = mock(["create", "patch"], {
      service: "tests",
      before: {
        test: true,
      },
      data: {
        test: false,
      },
      result: {
        test: false,
      },
      batchAction: (changes) => {
        cbCount++;
        changeCount = changes.length;
      },
    });

    await service.create([
      { id: 0, test: true },
      { id: 1, test: true },
      { id: 2, test: true },
    ]);
    assert.strictEqual(cbCount, 0, "action cb was not called");

    await service.patch(null, {
      test: false,
    });

    assert.strictEqual(cbCount, 1, "action cb was called only a single time");
    assert.strictEqual(
      changeCount,
      3,
      "action cb was called with three change tuples",
    );

    await service.patch(null, {
      test: false,
    });

    assert.strictEqual(cbCount, 1, "action cb was called only a single time");
    assert.strictEqual(
      changeCount,
      3,
      "action cb was called with three change tuples",
    );
  });

  it("patch: triggers on multi create with complex conditions in batch mode", async function () {
    let cbCount = 0;
    let changeCount = 0;
    const { service } = mock(["create", "patch"], {
      service: "tests",
      before: {
        submittedAt: {
          $ne: null,
        },
        approvedAt: null,
      },
      data: {
        approvedAt: {
          $ne: null,
        },
      },
      result: {
        approvedAt: {
          $ne: null,
        },
        declinedAt: null,
      },
      batchAction: (changes) => {
        cbCount++;
        changeCount = changes.length;
      },
    });

    await service.create([
      { id: 0, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 1, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 2, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 12, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 13, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 14, submittedAt: null, approvedAt: null, declinedAt: null },
    ]);

    await service.patch(
      null,
      {
        submittedAt: new Date(),
      },
      {
        query: {
          id: {
            $in: [12, 13, 14],
          },
        },
      },
    );

    assert.strictEqual(cbCount, 0, "action cb was not called");

    await service.patch(
      null,
      {
        approvedAt: new Date(),
      },
      {
        query: {
          id: {
            $in: [12, 13, 14],
          },
        },
      },
    );

    assert.strictEqual(cbCount, 1, "action cb was called only a single time");
    assert.strictEqual(
      changeCount,
      3,
      "action cb was called with three change tuples",
    );
  });
});

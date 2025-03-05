---
sidebarDepth: 2
---

# Hooks

## trigger

| type                        | methods                               | multi | details                                                                                 |
| --------------------------- | ------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `before`, `after`, `around` | `create`, `patch`, `update`, `remove` | yes   | [source](https://github.com/fratzinger/feathers-trigger/blob/main/src/hooks/trigger.ts) |

### Options

The options of the `trigger` hook are of type: `Subcription` or `Subcription[]` or `(context: HookContext) => Promisable<Subscription | Subscription[]>`. But what is a `Subcription`?

A subscription is an object with the following properties:

| Property           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service`          | The service to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                                        |
| `method`           | The method to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                                         |
| `data`             | Check the `context.data` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br> `Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                  |
| `result`           | Check the `context.result` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (change: { item: T; before: T \| undefined }, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                             |
| `params`           | Check the `context.params` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                 |
| `fetchBefore`      | The `trigger` hook lets you compare the result against the item before. This is disabled by default for performance reasons. If you use `conditionsBefore`, it will fetch the items in the before hook automatically. If you don't need `conditionsBefore` but your `conditionsResult` looks something like: <span v-pre>`({ before }) => ({ publishedAt: { $gt: before.publishedAt } })` you need to set `fetchBefore:true` explicitely</span><br><br>**Type:** `boolean`<br>**optional** - _Default:_ `false` |
| `before`           | Check the `before` object from `trigger` before hook, if available. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                       |
| `manipulateParams` | You can extend the `params` for the subscription, e.g. for population.<br><br>**Type:** `(params: Params, context: HookContext) => (Promisable<Params>)`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                               |
| `action`           | The action, that will be run, if all checks pass for the subscription.<br><br>**Type:** `({ before, item }, { context, items, subscription }) => Promisable<any>`<br>**Type (batchMode=true):** `(changes: [change: { before, item }, options: { context, items, subscription }][], context) => Promisable<any>`<br> **optional** - _Default:_ `undefined`                                                                                                                                                      |
| `batchMode`        | Enables batch mode. In batch mode: If multiple items are passed to create, it will only run action once with all items matching the conditions.<br><br> **Type:** `boolean` <br>**optional** - _Default:_ `false`                                                                                                                                                                                                                                                                                               |
| `isBlocking`       | Wether the `trigger` hook should wait for the async `action` before continuing.<br><br>**Type:** `boolean`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                                                                                                                                                  |

### Action

The `action` from `subscription` is the function that runs, after all `conditions` are fulfilled. The function looks like the following:

```js
const action = async ({ before, item }, { context, items, subscription }) => {
  // do your own implementation
};

// In batch mode

const action = async (changes) => {
  for (const [{ before, item }, { context, items, subscription }] of changes) {
    // do your own implementation
  }
};
```

## changesById

| type                        | methods                               | multi | details                                                                                     |
| --------------------------- | ------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `before`, `after`, `around` | `create`, `patch`, `update`, `remove` | yes   | [source](https://github.com/fratzinger/feathers-trigger/blob/main/src/hooks/changesById.ts) |

### Options

| Property    | Description                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `params`    | With the `params` options, you can manipulate params for `changesById` if you need to.<br><br>**Type:** `(params: Params, context: HookContext) => (Params \| Promise<Params>)`<br>**optional** - _Default:_ `undefined` |
| `skipHooks` | Use `find` or `_find` for refetching<br><br>**Type:** `boolean`<br>**optional** - _Default:_ `false`                                                                                                                     |

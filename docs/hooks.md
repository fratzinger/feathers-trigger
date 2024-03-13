---
sidebarDepth: 2
---

# Hooks

## trigger

|before|after|methods|multi|details|
|---|---|---|---|---|
|yes|yes|`create`, `patch`, `update`, `remove`|yes|[source](https://github.com/fratzinger/feathers-trigger/blob/main/src/hooks/trigger.ts)|

### Options

The options of the `trigger` hook are of type: `Subcription` or `Subcription[]` or `(context: HookContext) => Promisable<Subscription | Subscription[]>`. But what is a `Subcription`?

A subscription is an object with the following properties: 

| Property           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `service`          | The service to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - *Default:* `undefined`                                                                                                                                                                                                                                                                                                              |
| `method`           | The method to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - *Default:* `undefined`                                                                                                                                                                                                                                                                                                               |
| `conditionsData`   | Check the `context.data` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>Replaces all <span v-pre>`{{ placeholders }}`</span> with the `sub.view` object. For more information, look at the **View** section down below.<br><br>**Type:** `Record<string, any> \| boolean`<br>**optional** - *Default:* `true`                                                                                                                                                      |
| `conditionsResult` | Check the `context.result` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>Replaces all <span v-pre>`{{ placeholders }}`</span> with the `sub.view` object. For more information, look at the **View** section down below.<br><br>**Type:** `Record<string, any> \| boolean`<br>**optional** - *Default:* `true`                                                                                                                                                    |
| `conditionsParams` | Check the `context.params` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>Replaces all <span v-pre>`{{ placeholders }}`</span> with the `sub.view` object. For more information, look at the **View** section down below.<br><br>**Type:** `Record<string, any> \| boolean`<br>**optional** - *Default:* `true`                                                                                                                                                    |
| `fetchBefore`      | The `trigger` hook lets you compare the result against the item before. This is disabled by default for performance reasons. If you use `conditionsBefore`, it will fetch the items in the before hook automatically. If you don't need `conditionsBefore` but your `conditionsResult` looks something like: <span v-pre>`{ publishedAt: { $gt: '{{ before.publishedAt }}' } }` you need to set `fetchBefore:true` explicitely</span><br><br>**Type:** `boolean`<br>**optional** - *Default:* `false` |
| `conditionsBefore` | Check the `before` object from `trigger` before hook, if available. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>Replaces all <span v-pre>`{{ placeholders }}`</span> with the `sub.view` object. For more information, look at the **View** section down below.<br><br>**Type:** `Record<string, any> \| boolean`<br>**optional** - *Default:* `true`                                                                                                                          |
| `view`             | The `trigger` function provides some `view` properties by default. See the **View** chapter down below. You can extend the view, if you need to.<br><br>**Type 1:** `Record<string, any>`<br>**Type 2:** `(view, item, items, subscriptions, context) => Promisable<Record<string, any>>`<br>**optional** - *Default:* `false`                                                                                                                                                                        |
| `params`           | You can extend the `params` for the subscription, e.g. for population.<br><br>**Type:** `(params: Params, context: HookContext) => (Promisable<Params>)`<br>**optional** - *Default:* `undefined`                                                                                                                                                                                                                                                                                                     |
| `action`           | The action, that will be run, if all checks pass for the subscription.<br><br>**Type:** `({ before, item }, { context, items, subscription, view }) => Promisable<any>`<br>**Type (batchMode=true):** `(changes: [change: { before, item }, options: { context, items, subscription, view }][]) => Promisable<any>`<br> **optional** - *Default:* `undefined`                                                                                                                                         |
| `batchMode` | Enables batch mode. In batch mode: If multiple items are passed to create, it will only run action once with all items matching the conditions.<br><br> **Type:** `boolean` <br>**optional** - *Default:* `false`                        
| `isBlocking`       | Wether the `trigger` hook should wait for the async `action` before continuing.<br><br>**Type:** `boolean`<br>**optional** - *Default:* `true`                                                                                                                                                                                                                                                                                                                                                        |
| *anything else*    | You can add whatever property you need for a subscription.                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### View

The concept of `'{{ curlyBrackets }}'` is heavily inspired by [mustache.js](https://github.com/janl/mustache.js/) where the `render` function takes a `view` object. That's why it's called `view` in `feathers-trigger`. Views can be used to transform `conditionsData`, `conditionsBefore`, `conditionsResult` and replace placeholder curly brackets strings with values. The `trigger` hook is capable of more complex conditions where you need to compare the `result` against data that is dynamic in the `context`. 

Properties of views for *mustache-like* transformations of conditions have the following by default:

- `item`: the result item
- `before`: the item from the `trigger` before-hook
- `data`: `context.data` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `id`: `context.id` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `method`: `context.method` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `now`: `new Date()` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `params`: `context.params` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `path`: `context.path` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `service`: `context.service` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `type`: `context.type` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))
- `user`: `context.params.user` ([see feathers.js docs](https://docs.feathersjs.com/api/hooks.html#hook-context))

You can extend the views by the `views` option per subscription described above.

### Action

The `action` from `subscription` is the function that runs, after all `conditions` are fulfilled. The function looks like the following:

```js
const action = async (
  { before, item }, 
  { context, items, subscription, view }
) => {
  // do your own implementation
}

// In batch mode

const action = async (changes) => {
  for (const [{ before, item }, { context, items, subscription, view }] of changes) {
    // do your own implementation
  }
}
```

## changesById

|before|after|methods|multi|details|
|---|---|---|---|---|
|yes|yes|`create`, `patch`, `update`, `remove`|yes|[source](https://github.com/fratzinger/feathers-trigger/blob/main/src/hooks/changesById.ts)|

### Options

|       Property      |                Description                  |
|---------------------|---------------------------------------------|
| `params` | With the `params` options, you can manipulate params for `changesById` if you need to.<br><br>**Type:** `(params: Params, context: HookContext) => (Params \| Promise<Params>)`<br>**optional** - *Default:* `undefined` |
| `skipHooks`| Use `find` or `_find` for refetching<br><br>**Type:** `boolean`<br>**optional** - *Default:* `false` |

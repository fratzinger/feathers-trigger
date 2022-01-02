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

|       Property      |                Description                  |
|---------------------|---------------------------------------------|
| `service` | The service to subscribe to. |
| `method` | The method to subscribe to. |
| `conditionsData` | Check the `context.data` for something |
| `conditionsResult` | Check the `context.result` for something |
| `fetchBefore` | <br><br>**Type:** `boolean`<br>**optional** - *Default:* `false` |
| `conditionsBefore` | Check the  |
| `view` | |
| `params` | |
| `isBlocking` | <br><br>**Type:** `boolean`<br>**optional** - *Default:* `true` |
| `action` | |
| anything else | |

### views

Views can be used for `conditionsData`, `conditionsBefore`, `conditionsResult`. The `trigger` hook is capable of more complex conditions where you need to compare the `result` against data that is dynamic in the `context`. The concept is heavily inspired by [mustache.js](https://github.com/janl/mustache.js/).

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

## changesById

|before|after|methods|multi|details|
|---|---|---|---|---|
|yes|yes|`create`, `patch`, `update`, `remove`|yes|[source](https://github.com/fratzinger/feathers-trigger/blob/main/src/hooks/changesById.ts)|

### Options

|       Property      |                Description                  |
|---------------------|---------------------------------------------|
| `params` | With the `params` options, you can manipulate params for `changesById` if you need to.<br><br>**Type:** `(params: Params, context: HookContext) => (Params \| Promise<Params>)`<br>**optional** - *Default:* `undefined` |
| `skipHooks`| Use `find` or `_find` for refetching<br><br>**Type:** `boolean`<br>**optional** - *Default:* `false` |

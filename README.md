# feathers-trigger

<p align="center">
  <img src="https://feathers-trigger.netlify.app/img/logo.svg" width="200">
</p>

> NOTE: This is the version for Feathers v5. For Feathers v4 use [feathers-trigger v0](https://github.com/fratzinger/feathers-trigger/tree/crow)


[![npm](https://img.shields.io/npm/v/feathers-trigger)](https://www.npmjs.com/package/feathers-trigger)
[![GitHub Workflow Status](https://github.com/fratzinger/feathers-trigger/actions/workflows/node.js.yml/badge.svg)](https://github.com/fratzinger/feathers-trigger/actions)
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/fratzinger/feathers-trigger)](https://codeclimate.com/github/fratzinger/feathers-trigger)
[![Code Climate coverage](https://img.shields.io/codeclimate/coverage/fratzinger/feathers-trigger)](https://codeclimate.com/github/fratzinger/feathers-trigger)
[![libraries.io](https://img.shields.io/librariesio/release/npm/feathers-trigger)](https://libraries.io/npm/feathers-trigger)
[![npm](https://img.shields.io/npm/dm/feathers-trigger)](https://www.npmjs.com/package/feathers-trigger)
[![GitHub license](https://img.shields.io/github/license/fratzinger/feathers-trigger)](https://github.com/fratzinger/feathers-trigger/blob/master/LICENSE)

## Documentation

For more information, please have a look at the docs: [https://feathers-trigger.netlify.app/](https://feathers-trigger.netlify.app/getting-started.html)

## Installation

```bash
npm i feathers-trigger
```

## Usage

Imagine you want to notify users when a `post` gets published.

How can this be done? In this example a `post` has a `publishedAt` property which shows when a `post` was published. A `post` with `publishedAt === null` means that the `post` is not published yet. A `post` can be created as a draft which is not published.

But how do you know when a `post` gets published? Sounds silly, but there are three possibilities:
- A `post` gets created with `publishedAt: { $ne: null }`.
- A `post` gets updated by **data** `publishedAt: { $ne: null }`, it had `publishedAt: null` before and the **result** really has `publishedAt: { $ne: null }`.
- A `post` gets patched by **data** `publishedAt: { $ne: null }`, it had `publishedAt: null` before and the **result** really has `publishedAt: { $ne: null }`.

How can this be accomplished?
1. Check `context.data` for `publishedAt: { $ne: null }` and if that's not true, the subscription is not true.
2. Check if the post in the database has `publishedAt === null` and therefore is not published yet. You need to check that in a `before` hook. If that's not true, the subscription is not true.
3. Check if the `context.result` really has `publishedAt: { $ne: null }` (maybe it's handled by another permission hook, or something). If that's not true, the subscription is not true.
4. If all three checks are true, run the `notify` function.


It's up to you how you define the `notify` action. For the example above the solution with `feathers-trigger` looks like the following:

```js
// posts.hooks.js
import { trigger } from 'feathers-trigger';

const notifyPublished = trigger({
  conditionsData: { publishedAt: { $ne: null } },
  conditionsBefore: { publishedAt: null },
  conditionsResult: { publishedAt: { $ne: null }},
  action: ({ item }, context) => {
    return context.app.service('/notify').create(item);
  }
});

export default {
  before: {
    create: [ notifyPublished ],
    update: [ notifyPublished ],
    patch: [ notifyPublished ]
  },
  after: {
    create: [ notifyPublished ],
    update: [ notifyPublished ],
    patch: [ notifyPublished ]
  }
}
```

For more advanced examples, please have a look at the [docs](https://feathers-trigger.netlify.app/getting-started.html)

## Testing

Simply run `npm test` and all your tests in the `test/` directory will be run. It has full support for *Visual Studio Code*. You can use the debugger to set breakpoints.

## Help

For more information on all the things you can do, visit [FeathersJS](http://docs.feathersjs.com).

## License

Licensed under the [MIT license](LICENSE).
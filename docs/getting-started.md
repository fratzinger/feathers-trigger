---
title: Getting Started
sidebarDepth: 2
---

# Getting Started

<p align="center">
  <img src="/img/logo.svg" width="150">
</p>

![npm](https://img.shields.io/npm/v/feathers-trigger)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/fratzinger/feathers-trigger/Node.js%20CI)
![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/fratzinger/feathers-trigger)
![Code Climate coverage](https://img.shields.io/codeclimate/coverage/fratzinger/feathers-trigger)
![libraries.io](https://img.shields.io/librariesio/release/npm/feathers-trigger)
![npm](https://img.shields.io/npm/dm/feathers-trigger)
![GitHub license](https://img.shields.io/github/license/fratzinger/feathers-trigger)

## About

`feathers-trigger` provides a hook called `trigger`. This hook is meant to be used for a subscription pattern. It's inspired by services like [IFTTT](https://ifttt.com/) or [Zapier](https://zapier.com/) where you automate things by providing a `trigger` and an `action`. The hook `trigger` can be used for methods `create`, `update`, `patch` and `remove`. While configuring the `trigger` hook you provide a `subscription` which checks for `context.data` and `context.result` and if the check is fulfilled, it runs an `action` callback function you provide.

Use cases are notifications or logs like:
- `'A todo was created/updated/removed'`
- `'User "xy" assigned the todo "get things done" to you'`
- `'The due date of a todo "procrastinate" was delayed by more than 3 days'`

### Features:
- check for conditions with [sift.js](https://github.com/crcn/sift.js/)
- <span v-pre>check for changes like: `{ publishedAt: { $lt: '{{ before.publishedAt }}' } }`</span>
- `subscriptions` can be stored in a database
- check for populations or something.
- Written in Typescript

## Installation

```bash
npm i feathers-trigger
```

## Simple example

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
  action: ({ item }, { context }) => {
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

```js
// examples
const postsService = app.service('posts');
// scenario 1:
const post = await postsService.create({ title: 'hello', publishedAt: new Date() }) 
// notification called
await postsService.patch(post.id, { publishedAt: new Date() });
// notification not called again

// scenario 2:
const post = await postsService.create({ title: 'hello', publishedAt: null })
// notification not called yet
await postsService.update(post.id, { title: 'ciao', publishedAt: null }); 
// notification not called yet
await postsService.update(post.id, { title: 'hello', publishedAt: new Date() }); 
// notification called
await postsService.update(post.id, { title: 'hello', publishedAt: new Date() });
// notification not called again

// scenario 3:
const post = await postsService.create({ title: 'hello', publishedAt: null })
// notification not called yet
await postsService.patch(post.id, { title: 'ciao' }); 
// notification not called yet
await postsService.patch(post.id, { publishedAt: new Date() }); 
// notification called
await postsService.patch(post.id, { publishedAt: new Date() });
// notification not called again

```


## Complex example

Imagine you want to notify a user when his `todo` gets **delayed**. And only when it gets delayed! Todos can be changed by all members of a team. The user only needs to get notified, if another person changes the date of the `todo`. If he changes the data himself, we can assume he noticed the change and doesn't need an annoying notification, right?

How can this be done? Each `todo` has at least two properties:
- `userId`: shows who is responsible for the `todo`
- `dueAt`: show when the todo needs to be done at the latest

```js
// todos.hooks.js
import { trigger } from 'feathers-trigger';

const notifyDelay = trigger([{
  fetchBefore: true,
  conditionsResult: { startsAt: { $gt: "{{ before.startsAt }}" }, userId: { $ne: "{{ user.id }}" } },
  action: ({ item }, { context }) => {
    return context.app.service('/notify').create(item);
  }
}]);

export default {
  before: {
    create: [ notifyDelay ],
    update: [ notifyDelay ],
    patch: [ notifyDelay ]
  },
  after: {
    create: [ notifyDelay ],
    update: [ notifyDelay ],
    patch: [ notifyDelay ]
  }
}
```

### Explanation

You may wonder, what happens on `conditionsResult`. This is where `feathers-trigger` shows its power. It's heavily inspired by [mustache.js](https://github.com/janl/mustache.js/). If you're not familiar with the concept, please make sure to give it a short glance before continuing here.

The `trigger` hook exposes some views-properties for the `conditionsData`, `conditionsBefore`, `conditionsResult` by default ([described here](hooks.html#trigger)). In the example above the property `before` (from `trigger` before-hook) and `user` (from `context.params.user` *authentication*) is used.

<span v-pre>The condition for `startsAt: { $gt: "{{ before.startsAt }}" }` is only true for the following change:</span>
- `startsAt` had a `Date` value before (e.g. was not `null`)
- `startsAt` now has a `Date` value
- `startsAt` was earlier as it is now

<span v-pre>The condition for `userId: { $ne: "{{ user.id }}" }` is only true for the following:</span>
- `userId` is not the same as `context.params.user.id`

## Testing

Simply run `npm test` and all your tests in the `test/` directory will be run. The project has full support for *Visual Studio Code*. You can use the debugger to set breakpoints.

## Help

For more information on all the things you can do, visit [FeathersJS](http://docs.feathersjs.com).

## License

Licensed under the [MIT license](https://github.com/fratzinger/feathers-trigger/blob/main/LICENSE).
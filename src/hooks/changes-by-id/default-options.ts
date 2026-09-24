import type { HookChangesByIdOptions } from './types.js'

export const defaultOptions = {
  skipHooks: false,
  params: undefined,
  name: 'changesById',
  deleteParams: [],
  fetchBefore: false,
} satisfies Partial<HookChangesByIdOptions>

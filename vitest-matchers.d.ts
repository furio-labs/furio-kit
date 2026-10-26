// @testing-library/jest-dom 7.0.1 augments vitest's `Assertion<T>`, but vitest 5
// changed it to `Assertion<R, T>`, so the matchers silently drop out of the types.
// vitest 5's extension point is `Matchers<R, T>`. Delete this file once jest-dom
// ships vitest 5 types.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<unknown, R> {}
}

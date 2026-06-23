import { defineConfig } from "vitest/config";

/**
 * Shared test config for the project. Tests live next to the code they cover
 * (e.g. app/misc/split-cost/*.test.js) and run with `npm run test:unit`.
 *
 * The default environment is "node" so pure-function and server-action tests
 * need no extra dependencies. Component tests that need a DOM should opt in
 * per-file with a docblock at the top of the test file:
 *
 *   // @vitest-environment jsdom
 *
 * (and install `jsdom` + `@testing-library/react`).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});

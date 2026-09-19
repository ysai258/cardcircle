/**
 * Stub for the `server-only` marker package.
 *
 * `server-only` throws unless resolved under the `react-server` export
 * condition, which Vitest does not set. Aliasing it here lets tests import
 * modules that carry the marker. The marker still does its real job in the
 * Next.js build, which is where it matters.
 */
export {}

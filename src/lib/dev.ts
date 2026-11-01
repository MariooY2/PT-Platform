/**
 * The /dev/ui gallery is a development tool. It renders in dev, and in a production build only when
 * ENABLE_DEV_UI=1 (set by the e2e server). A real production deploy leaves the flag unset, so the
 * route 404s. Read at request time (the route forces dynamic rendering), never inlined at build.
 */
export function devUiEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_UI === '1';
}

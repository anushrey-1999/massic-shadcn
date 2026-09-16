/**
 * Routes that should use the empty layout (without sidebar)
 * Add route paths here to exclude them from the default sidebar layout
 */
export const routesWithoutSidebar: string[] = [
  '/login',
  '/signup',
  '/team-signup',
  '/wordpress/connect',
  '/snapshot',
]

/**
 * Route prefixes that should use the empty layout.
 * Any pathname starting with one of these prefixes will use the empty layout.
 */
export const routePrefixesWithoutSidebar: string[] = [
  '/google-access',
  '/email/verify',
  '/r/',
  '/admin'
]

const AGENT_PATH = /^\/business\/[^/]+\/agent\/?$/

export function isAgentRoute(pathname: string) {
  return AGENT_PATH.test(pathname)
}

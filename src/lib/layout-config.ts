/**
 * Routes that should use the empty layout (without sidebar)
 * Add route paths here to exclude them from the default sidebar layout
 */
export const routesWithoutSidebar: string[] = [
  '/login',
  '/signup',
  '/team-signup',
  '/wordpress/connect',
]

/**
 * Route prefixes that should use the empty layout.
 * Any pathname starting with one of these prefixes will use the empty layout.
 */
export const routePrefixesWithoutSidebar: string[] = [
  '/google-access',
]

const SEARCH_CONSOLE_USERS_URL = "https://search.google.com/search-console/users";

export function getSearchConsoleUsersUrl(resourceId: string) {
  const url = new URL(SEARCH_CONSOLE_USERS_URL);
  url.searchParams.set("resource_id", resourceId);
  return url.toString();
}

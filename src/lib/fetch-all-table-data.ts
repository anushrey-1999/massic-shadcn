interface PageResult<T> {
  data: T[];
  pageCount?: number;
}

export async function fetchAllTableData<T>(
  fetchPage: (page: number, perPage: number) => Promise<PageResult<T>>,
  perPage = 5000
) {
  const firstPage = await fetchPage(1, perPage);
  const totalPages = Math.min(firstPage.pageCount || 1, 100);
  if (totalPages <= 1) return firstPage.data;

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const remainingResults = await Promise.all(
    remainingPages.map((page) => fetchPage(page, perPage))
  );

  return [
    ...firstPage.data,
    ...remainingResults.flatMap((result) => result.data),
  ];
}

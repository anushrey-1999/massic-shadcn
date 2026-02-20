import { cleanEscapedContent } from "@/utils/content-cleaner";

export function resolveRawPageContent(responseData: any): string {
  const pageContent = responseData?.output_data?.page?.page_content;

  if (typeof pageContent === "string") {
    return pageContent;
  }

  if (pageContent && typeof pageContent === "object" && typeof pageContent.page_content === "string") {
    return pageContent.page_content;
  }

  return "";
}

export function resolvePageContent(responseData: any): string {
  return cleanEscapedContent(resolveRawPageContent(responseData));
}

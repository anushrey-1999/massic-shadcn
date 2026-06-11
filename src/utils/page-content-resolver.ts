import { cleanEscapedContent } from "@/utils/content-cleaner";

export function resolveRawPageContent(responseData: any): string {
  const pageContent = responseData?.output_data?.page?.page_content;

  if (typeof pageContent === "string") {
    return pageContent;
  }

  if (pageContent && typeof pageContent === "object" && typeof pageContent.body === "string") {
    return pageContent.body;
  }

  if (pageContent && typeof pageContent === "object" && typeof pageContent.page_content === "string") {
    return pageContent.page_content;
  }

  return "";
}

export function resolvePageContent(responseData: any): string {
  const formattedHtml = resolveFormattedPageHtml(responseData);
  if (formattedHtml) {
    return formattedHtml;
  }

  return cleanEscapedContent(resolveRawPageContent(responseData));
}

export function resolveRawFormattedPageHtml(responseData: any): string {
  const formattedPage = responseData?.output_data?.page?.formatted_page;

  if (formattedPage && typeof formattedPage === "object" && typeof formattedPage.html === "string") {
    return formattedPage.html;
  }

  return "";
}

export function resolveFormattedPageHtml(responseData: any): string {
  return cleanEscapedContent(resolveRawFormattedPageHtml(responseData));
}

export function resolvePageMetaFields(responseData: any): {
  title: string;
  metaTitle: string;
  metaDescription: string;
} {
  const page = responseData?.output_data?.page || {};
  const formattedPage = page?.formatted_page || {};
  const pageContent = page?.page_content || {};

  const title =
    typeof formattedPage?.title === "string" && formattedPage.title.trim()
      ? formattedPage.title
      : typeof pageContent?.title === "string" && pageContent.title.trim()
        ? pageContent.title
        : typeof page?.title === "string" && page.title.trim()
          ? page.title
          : "";

  const metaTitle =
    typeof formattedPage?.meta_title === "string" && formattedPage.meta_title.trim()
      ? formattedPage.meta_title
      : typeof pageContent?.meta_title === "string" && pageContent.meta_title.trim()
        ? pageContent.meta_title
        : typeof page?.meta_title === "string" && page.meta_title.trim()
          ? page.meta_title
          : "";

  const metaDescription =
    typeof formattedPage?.meta_description === "string" && formattedPage.meta_description.trim()
      ? formattedPage.meta_description
      : typeof pageContent?.meta_description === "string" && pageContent.meta_description.trim()
        ? pageContent.meta_description
        : typeof page?.meta_description === "string" && page.meta_description.trim()
          ? page.meta_description
          : "";

  return {
    title: cleanEscapedContent(title),
    metaTitle: cleanEscapedContent(metaTitle),
    metaDescription: cleanEscapedContent(metaDescription),
  };
}

export function resolveRawFormattedBlogHtml(responseData: any): string {
  const formattedBlog = responseData?.output_data?.page?.formatted_blog;

  if (formattedBlog && typeof formattedBlog === "object" && typeof formattedBlog.html === "string") {
    return formattedBlog.html;
  }

  return "";
}

export function resolveFormattedBlogHtml(responseData: any): string {
  return cleanEscapedContent(resolveRawFormattedBlogHtml(responseData));
}

export function resolveRawBlogMarkdownContent(responseData: any): string {
  const blogContent = responseData?.output_data?.page?.blog;

  if (typeof blogContent === "string") {
    return blogContent;
  }

  if (blogContent && typeof blogContent === "object" && typeof blogContent.blog_post === "string") {
    return blogContent.blog_post;
  }

  return "";
}

export function resolveBlogMarkdownContent(responseData: any): string {
  return cleanEscapedContent(resolveRawBlogMarkdownContent(responseData));
}

export function resolveBlogFinalContent(responseData: any): string {
  const formattedHtml = resolveFormattedBlogHtml(responseData);
  if (formattedHtml) {
    return formattedHtml;
  }

  return resolveBlogMarkdownContent(responseData);
}

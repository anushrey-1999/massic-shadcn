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

import { ContentConverter } from "@/utils/content-converter";

export async function generatePdfFromMarkdown(markdown: string, filename: string): Promise<void> {
  const content = ContentConverter.markdownToHtml(markdown);

  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html: content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

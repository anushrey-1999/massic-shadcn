export async function generatePdfFromMarkdown(markdown: string, filename: string): Promise<void> {
  const pdfFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title: filename.replace(".pdf", "") }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || "Failed to generate PDF");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFilename;
  link.click();
  URL.revokeObjectURL(url);
}

import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";

// Singleton browser instance to reuse across requests
let browserInstance: Browser | null = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Optimize memory usage
        "--headless",
      ],
    });
  }
  return browserInstance;
}

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Set a reasonable viewport
      await page.setViewport({ width: 1200, height: 1600 });

      // CSS to inject for styling the PDF
      const styles = `
        <style>
          body {
            font-family: ui-sans-serif, system-ui, sans-serif;
            color: #000000;
            background-color: #ffffff;
            padding: 40px;
            margin: 0;
          }
          .pdf-content {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; margin-top: 0; color: #111827; }
          h2 { font-size: 20px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; color: #1f2937; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
          h3 { font-size: 18px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #374151; }
          p { margin-bottom: 16px; line-height: 1.6; font-size: 14px; color: #374151; }
          ul, ol { margin-bottom: 16px; padding-left: 24px; }
          li { margin-bottom: 4px; line-height: 1.6; font-size: 14px; color: #374151; }
          strong { font-weight: 600; color: #111827; }
          a { color: #2563eb; text-decoration: underline; }
          blockquote { border-left: 4px solid #e5e5e5; padding-left: 16px; margin: 16px 0; font-style: italic; color: #4b5563; }
          code { font-family: ui-monospace, monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; color: #111827; }
          pre { background-color: #f3f4f6; padding: 16px; border-radius: 6px; overflow-x: auto; margin-bottom: 16px; }
          pre code { background-color: transparent; padding: 0; color: inherit; }
          hr { border: 0; border-top: 1px solid #e5e5e5; margin: 32px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
          th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #111827; }
          td { padding: 8px; border-bottom: 1px solid #e5e5e5; color: #374151; }
        </style>
      `;

      const fullContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            ${styles}
          </head>
          <body>
            <div class="pdf-content">
              ${html}
            </div>
          </body>
        </html>
      `;

      // Optimized load: wait only for DOM to be ready, not all network resources
      await page.setContent(fullContent, { waitUntil: "domcontentloaded" });

      const pdfUint8Array = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px",
        },
      });

      // Fix type error: Convert Uint8Array to Buffer for NextResponse
      const pdfBuffer = Buffer.from(pdfUint8Array);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
        },
      });
    } finally {
      // Always close the page to free memory, but keep the browser open
      await page.close();
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import Showdown from "showdown";

const CHROMIUM_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

const converter = new Showdown.Converter({
  tables: true,
  ghCompatibleHeaderId: true,
  simpleLineBreaks: true,
  emoji: true,
});

let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    const isLocal = process.env.NODE_ENV === "development";

    if (isLocal) {
      const puppeteerFull = await import("puppeteer");
      browserInstance = await puppeteerFull.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    } else {
      browserInstance = await puppeteer.launch({
        args: [...chromium.args, "--disable-dev-shm-usage"],
        defaultViewport: { width: 1200, height: 800 },
        executablePath: await chromium.executablePath(CHROMIUM_URL),
        headless: true,
      });
    }

    browserPromise = null;
    return browserInstance;
  })();

  return browserPromise;
}

const CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px;
  }
  
  h1 {
    font-size: 1.75rem;
    line-height: 1.25;
    font-weight: 600;
    margin: 1rem 0;
  }
  
  h2 {
    font-size: 1.5rem;
    line-height: 1.3;
    font-weight: 600;
    margin: 1rem 0;
  }
  
  h3 {
    font-size: 1.25rem;
    line-height: 1.35;
    font-weight: 600;
    margin: 0.75rem 0;
  }
  
  h4 {
    font-size: 1.125rem;
    line-height: 1.4;
    font-weight: 600;
    margin: 0.75rem 0;
  }
  
  p {
    margin: 0.75rem 0;
  }
  
  ul {
    list-style: disc;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }
  
  ol {
    list-style: decimal;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }
  
  li {
    margin: 0.25rem 0;
  }
  
  blockquote {
    border-left: 3px solid #e5e5e5;
    padding-left: 1rem;
    margin: 0.75rem 0;
    font-style: italic;
    color: #666;
  }
  
  a {
    color: #0066cc;
    text-decoration: underline;
  }
  
  strong {
    font-weight: 600;
  }
  
  em {
    font-style: italic;
  }
  
  code {
    background: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.75rem 0;
  }
  
  pre code {
    background: none;
    padding: 0;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  
  th, td {
    border: 1px solid #e5e5e5;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  
  th {
    background: #f9f9f9;
    font-weight: 600;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 1.5rem 0;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
`;

export async function POST(request: NextRequest) {
  let page = null;
  try {
    const { markdown, title } = await request.json();

    if (!markdown) {
      return NextResponse.json({ error: "Markdown content is required" }, { status: 400 });
    }

    const html = converter.makeHtml(markdown);
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || "Document"}</title>
          <style>${CSS}</style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title || "document"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    if (page) await page.close();
  }
}

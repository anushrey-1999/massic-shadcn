import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 300000;

type UpstreamResponse = {
  conversation_id?: string;
  answer?: string;
  message?: string;
  response?: string;
} & Record<string, unknown>;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id") ?? searchParams.get("businessId");
  const source = searchParams.get("source") ?? "pages";

  if (!businessId) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  const promptUrl =
    process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://infer.seedinternaldev.xyz/v1";

  const body = (await request.json().catch(() => null)) as
    | { question?: string; conversation_id?: string }
    | null;

  const question = body?.question;
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const planType = source === "posts" ? "posts" : "pages";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  const upstreamResponse = await fetch(
    `${promptUrl.replace(/\/$/, "")}/chatbot/planner?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        ...(body?.conversation_id ? { conversation_id: body.conversation_id } : {}),
        calendar_events: [],
        plan_type: planType,
        page_ideas_required: 5,
      }),
      signal: controller.signal,
      cache: "no-store",
    },
  );
  clearTimeout(timeoutId);

  const text = await upstreamResponse.text();

  let data: UpstreamResponse | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: "Upstream request failed",
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        upstream: data ?? { raw: text },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(data ?? { raw: text });
}


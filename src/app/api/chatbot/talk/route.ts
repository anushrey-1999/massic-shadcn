import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type UpstreamResponse = {
  conversation_id?: string;
  answer?: string;
  message?: string;
  response?: string;
  references?: Array<{ text?: string } & Record<string, unknown>>;
} & Record<string, unknown>;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id") ?? searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Missing business_id" },
      { status: 400 }
    );
  }

  const promptUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://infer.seedinternaldev.xyz/v1';

  const body = (await request.json().catch(() => null)) as
    | { question?: string; conversation_id?: string }
    | null;

  const question = body?.question;
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const upstreamResponse = await fetch(
    `${promptUrl.replace(/\/$/, "")}/chatbot/conversation?business_id=${encodeURIComponent(
      businessId
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        ...(body?.conversation_id ? { conversation_id: body.conversation_id } : {}),
      }),
      cache: "no-store",
    }
  );

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
      { status: 502 }
    );
  }

  return NextResponse.json(data ?? { raw: text });
}

import type { Metadata } from "next";
import { Check, Clock3, Globe2, ShieldAlert } from "lucide-react";
import { PublicBusinessFavicon } from "@/components/public/public-business-favicon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify sender email | Massic",
  description: "Confirm a sender email for Massic.",
};

type VerificationData = {
  maskedEmail: string;
  domain: string;
  businessName?: string | null;
  businessWebsite?: string | null;
  verifiedAt: string;
};

type VerificationResponse = {
  err: boolean;
  code?: string;
  message?: string;
  data?: VerificationData;
};

function nodeApiBaseUrl() {
  const privateUrl = process.env.NODE_API_URL?.trim();
  if (privateUrl) return privateUrl.replace(/\/$/, "");

  const configuredUrl = process.env.NEXT_PUBLIC_NODE_API_URL?.trim();
  return (configuredUrl || "http://localhost:4922/api/1").replace(/\/$/, "");
}

async function verifySender(token: string): Promise<VerificationResponse> {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return { err: true, code: "INVALID_TOKEN" };
  }

  try {
    const response = await fetch(`${nodeApiBaseUrl()}/email-senders/verify?token=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = (await response.json()) as VerificationResponse;

    if (!response.ok || payload.err || !payload.data) {
      return { err: true, code: payload.code || "VERIFICATION_FAILED" };
    }

    return payload;
  } catch {
    return { err: true, code: "SERVICE_UNAVAILABLE" };
  }
}

function errorContent(code?: string) {
  if (code === "TOKEN_EXPIRED") {
    return {
      icon: Clock3,
      title: "Verification link expired",
      message: "Ask your Massic workspace admin to send a new link.",
    };
  }

  if (code === "SERVICE_UNAVAILABLE") {
    return {
      icon: ShieldAlert,
      title: "We couldn't verify this email",
      message: "Please try the link again in a few minutes.",
    };
  }

  return {
    icon: ShieldAlert,
    title: "Verification link unavailable",
    message: "This link is invalid, already used, or no longer active.",
  };
}

export default async function SenderVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await verifySender(token);
  const verified = !result.err ? result.data : undefined;
  const error = verified ? null : errorContent(result.code);
  const ErrorIcon = error?.icon;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f3ef] px-4 py-10 text-neutral-950 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(247,243,239,0)_44%)]" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55 blur-3xl" />

      <div className="verify-card relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2 text-[#2e6a56]">
            <img src="/massic-logo-green.svg" alt="" className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-[0.16em]">MASSIC</span>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-white/80 bg-white/80 p-7 text-center shadow-[0_24px_80px_rgba(65,50,38,0.13)] backdrop-blur-xl sm:p-9">
          {verified ? (
            <>
              <div className="relative mx-auto mb-6 w-fit">
                <div className="verify-pulse absolute inset-0 rounded-[1.35rem] border border-emerald-500/25" />
                <PublicBusinessFavicon
                  website={verified.businessWebsite || verified.domain}
                  businessName={verified.businessName}
                  className="h-16 w-16 rounded-[1.15rem]"
                />
                <span className="verify-check absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-sm">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </div>

              <div className="mb-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Verified
              </div>
              <h1 className="text-2xl font-medium tracking-[-0.035em]">Email verified</h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-neutral-500">
                This sender is ready to use in Massic.
              </p>

              <div className="mt-7 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left">
                <p className="break-all font-mono text-sm font-medium text-neutral-900">{verified.maskedEmail}</p>
                <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-neutral-500">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{verified.domain}</span>
                </div>
              </div>

              <p className="mt-6 text-xs text-neutral-400">You can close this tab and return to Massic.</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                {ErrorIcon ? <ErrorIcon className="h-7 w-7" /> : null}
              </div>
              <h1 className="text-2xl font-medium tracking-[-0.035em]">{error?.title}</h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-neutral-500">{error?.message}</p>
            </>
          )}
        </section>
      </div>

      <style>{`
        @keyframes verifyCardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes verifyPulse {
          0% { transform: scale(0.92); opacity: 0.65; }
          75%, 100% { transform: scale(1.28); opacity: 0; }
        }

        @keyframes verifyCheckIn {
          0% { transform: scale(0.45) rotate(-14deg); opacity: 0; }
          70% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        .verify-card { animation: verifyCardIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .verify-pulse { animation: verifyPulse 1.5s cubic-bezier(0.22, 1, 0.36, 1) 2; }
        .verify-check { animation: verifyCheckIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both; }

        @media (prefers-reduced-motion: reduce) {
          .verify-card, .verify-pulse, .verify-check { animation: none; }
        }
      `}</style>
    </main>
  );
}

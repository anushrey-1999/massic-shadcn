"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

function normalizeUrlDomain(input: string) {
	const raw = (input || "").trim().toLowerCase();
	if (!raw) return "";
	const cleaned = raw.replace(/^sc-domain:/, "");
	try {
		const withProto = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
		const url = new URL(withProto);
		return url.hostname.replace(/^www\./, "");
	} catch {
		return (
			cleaned
				.replace(/^https?:\/\//, "")
				.replace(/^www\./, "")
				.split("/")[0] || raw
		);
	}
}

export function ProspectsCard({
	url,
	onConnectGoogle,
}: {
	url?: string;
	onConnectGoogle?: () => void;
}) {
	const domain = normalizeUrlDomain(url || "");

	return (
		<Card className="p-2 border-general-border-three shadow-none rounded-lg flex flex-col gap-4">
			<CardTitle className="p-0 font-normal">
				<Typography
					variant="p"
					className="text-base text-general-unofficial-foreground-alt font-mono leading-[150%]"
				>
					{domain}
				</Typography>
			</CardTitle>
			<CardContent className="p-0 flex justify-end">
				<Button
					type="button"
					variant="secondary"
					className="h-9 w-fit"
					onClick={(e: MouseEvent) => {
						e.preventDefault();
						e.stopPropagation();
						onConnectGoogle?.();
					}}
				>
					<Image src="/google.svg" alt="Google" width={16} height={16} />
					Connect Google
				</Button>
			</CardContent>
		</Card>
	);
}

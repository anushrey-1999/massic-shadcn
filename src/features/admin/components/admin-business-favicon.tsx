import { SiteFavicon } from "@/components/organisms/WebChannels/platform-icon";
import { cn } from "@/lib/utils";

export function AdminBusinessFavicon({
  siteUrl,
  className,
}: {
  siteUrl?: string | null;
  className?: string;
}) {
  return (
    <SiteFavicon
      siteUrl={siteUrl}
      className={cn(
        "border-general-border-three bg-general-input shadow-xs ring-1 ring-general-border/70",
        className,
      )}
    />
  );
}

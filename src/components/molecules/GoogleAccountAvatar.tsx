"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// Google rate-limits hotlinked profile images, so each URL is loaded once and
// every avatar for that account renders from the same result.
const googleAvatarLoads = new Map<string, Promise<boolean>>();
const googleAvatarLoaded = new Map<string, boolean>();

function loadGoogleAvatar(url: string): Promise<boolean> {
  let load = googleAvatarLoads.get(url);
  if (!load) {
    load = new Promise<boolean>((resolve) => {
      const image = new Image();
      image.referrerPolicy = "no-referrer";
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    }).then((loaded) => {
      googleAvatarLoaded.set(url, loaded);
      return loaded;
    });
    googleAvatarLoads.set(url, load);
  }
  return load;
}

function useGoogleAvatarLoaded(url?: string | null): boolean {
  const [loaded, setLoaded] = useState(() =>
    url ? googleAvatarLoaded.get(url) === true : false,
  );

  useEffect(() => {
    if (!url) {
      setLoaded(false);
      return;
    }
    let active = true;
    void loadGoogleAvatar(url).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return loaded;
}

interface GoogleAccountAvatarProps {
  email: string | null;
  pictureUrl?: string | null;
  className?: string;
}

/** Google account picture, falling back to the email initial until it loads. */
export function GoogleAccountAvatar({
  email,
  pictureUrl,
  className,
}: GoogleAccountAvatarProps) {
  const showPicture = useGoogleAvatarLoaded(pictureUrl);

  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-[10px] font-medium uppercase text-blue-700",
        className,
      )}
    >
      {showPicture && pictureUrl ? (
        <img
          src={pictureUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        email?.charAt(0) || "G"
      )}
    </span>
  );
}

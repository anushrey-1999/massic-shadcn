"use client";

import * as React from "react";
import Image from "next/image";
import {
  Bookmark,
  Download,
  Film,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Play,
  PlusSquare,
  Repeat2,
  Search,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SocialChannel =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "twitter"
  | "x"
  | "youtube"
  | "tiktok"
  | "reddit"
  | string;

export interface SocialContentLikeOldUI {
  post?: string;
  caption?: string;
  hashtags?: string[];
  image_description?: string;
  visual_description?: string;
  video_script?: string;
  video_description?: string;
  thumbnail_description?: string;
  [key: string]: any;
}

function checkerStyle(): React.CSSProperties {
  const a = "hsl(var(--muted))";
  const b = "hsl(var(--background))";

  return {
    backgroundColor: b,
    backgroundImage: `linear-gradient(45deg, ${a} 25%, transparent 25%), linear-gradient(-45deg, ${a} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${a} 75%), linear-gradient(-45deg, transparent 75%, ${a} 75%)`,
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  };
}

function normalizeChannel(channel: SocialChannel): string {
  const normalized = (channel || "").toString().trim().toLowerCase();
  if (normalized === "x") return "twitter";
  return normalized;
}

function getHashtags(content: SocialContentLikeOldUI): string[] {
  return Array.isArray(content?.hashtags) ? content.hashtags : [];
}

function SafeText({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap text-[13.5px] leading-5 text-foreground">{text}</p>;
}

function PhoneShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full overflow-hidden rounded-lg bg-background", className)}>{children}</div>
  );
}

function CheckerStage({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full", className)} style={checkerStyle()}>
      {children}
    </div>
  );
}

function HashtagRow({ hashtags }: { hashtags: string[] }) {
  if (!hashtags.length) return null;
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {hashtags.map((tag, idx) => (
        <span key={`${tag}-${idx}`} className="text-sm text-primary hover:underline">
          #{tag}
        </span>
      ))}
    </div>
  );
}

export function InstagramPostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const imageText = (content.image_description || content.visual_description || "").toString();
  const caption = (content.caption || content.post || "").toString();
  const hashtags = getHashtags(content);

  return (
    <PhoneShell className="max-w-[375px]">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="relative h-9 w-9 shrink-0">
            <svg className="absolute inset-0 h-9 w-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M5.99526 5.99526C-0.634782 12.6253 -0.634782 23.3747 5.99526 30.0047C12.6253 36.6348 23.3747 36.6348 30.0047 30.0047C36.6348 23.3747 36.6348 12.6253 30.0047 5.99526C23.3747 -0.634782 12.6253 -0.634782 5.99526 5.99526ZM30.7279 5.27208C23.6985 -1.75736 12.3015 -1.75736 5.27208 5.27208C-1.75736 12.3015 -1.75736 23.6985 5.27208 30.7279C12.3015 37.7574 23.6985 37.7574 30.7279 30.7279C37.7574 23.6985 37.7574 12.3015 30.7279 5.27208Z" fill="url(#paint0_linear)" />
              <defs>
                <linearGradient id="paint0_linear" x1="30.7279" y1="5.27207" x2="5.27208" y2="30.7279" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D300C5" />
                  <stop offset="1" stopColor="#FFCB00" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute left-[2px] top-[2px] h-8 w-8 overflow-hidden rounded-full border border-[#DADADA]">
              <Image src="/icons/instagram.png" alt="Profile" fill sizes="32px" className="object-cover" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <p className="truncate text-sm font-bold leading-[18px] text-[#DADADA]">accountname</p>
          </div>
          <MoreVertical className="h-6 w-6 shrink-0 text-[#DADADA]" />
        </div>

        <div className="relative h-[375px] w-full">
          <Image src="/checkers.png" alt="" fill className="object-cover" />
          <div className="absolute left-1/2 top-1/2 flex w-[200px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white">
            <p className="w-[180px] text-center text-sm leading-5 text-[#262626]">
              Image Text Suggestion: {imageText || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna."}
            </p>
          </div>
        </div>

        <div className="flex flex-col px-3 py-2">
          <div className="flex items-center gap-4 pb-2">
            <Heart className="h-6 w-6 text-[#DADADA]" />
            <MessageCircle className="h-6 w-6 text-[#DADADA]" />
            <Send className="h-6 w-6 text-[#DADADA]" />
            <Bookmark className="ml-auto h-6 w-6 text-[#DADADA]" />
          </div>

          <div className="text-[13.5px] leading-5">
            <span className="font-bold text-[#262626]">accountname </span>
            <span className="text-[#262626]">
              {caption || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque"}
            </span>
            <span className="text-[#8E8E8E]">… more</span>
          </div>

          {hashtags.length > 0 && (
            <div className="mt-1 text-[13.5px] leading-5 text-[#00F]">
              {hashtags.map((tag) => `#${tag}`).join(" ")}
            </div>
          )}
          {hashtags.length === 0 && (
            <div className="mt-1 text-[13.5px] leading-5 text-[#00F]">
              #Loremipsum #consectetur #Loremipsum #consectetur
            </div>
          )}
        </div>

        <div className="flex items-start gap-0.5 px-3 py-3">
          <div className="flex flex-1 flex-col items-center gap-1">
            <Home className="h-6 w-6 text-[#DADADA]" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <Search className="h-6 w-6 text-[#DADADA]" strokeWidth={3} />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <PlusSquare className="h-6 w-6 text-[#DADADA]" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.04883 7.00195H21.9498" stroke="#DADADA" strokeWidth="2" strokeLinejoin="round" />
              <path d="M13.5039 2.00098L16.3619 7.00198" stroke="#DADADA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.20703 2.11035L10.002 7.00235" stroke="#DADADA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12.001V15.45C2 18.299 2.698 19.456 3.606 20.395C4.546 21.303 5.704 22.002 8.552 22.002H15.448C18.296 22.002 19.454 21.303 20.394 20.395C21.302 19.456 22 18.299 22 15.45V8.552C22 5.704 21.302 4.546 20.394 3.607C19.454 2.699 18.296 2 15.448 2H8.552C5.704 2 4.546 2.699 3.606 3.607C2.698 4.546 2 5.704 2 8.552V12.001Z" stroke="#DADADA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path fillRule="evenodd" clipRule="evenodd" d="M9.76259 17.6638C9.62447 17.584 9.50978 17.4693 9.43008 17.3312C9.35038 17.193 9.30848 17.0363 9.30859 16.8768V11.6298C9.30841 11.4701 9.3503 11.3132 9.43005 11.1748C9.5098 11.0364 9.6246 10.9215 9.76288 10.8416C9.90116 10.7617 10.0581 10.7197 10.2178 10.7197C10.3775 10.7198 10.5343 10.7619 10.6726 10.8418L15.2176 13.4658C15.3559 13.5455 15.4708 13.6603 15.5507 13.7986C15.6305 13.9368 15.6726 14.0936 15.6726 14.2533C15.6726 14.413 15.6305 14.5698 15.5507 14.708C15.4708 14.8463 15.3559 14.9611 15.2176 15.0408L10.6726 17.6648C10.5343 17.7447 10.3773 17.7867 10.2176 17.7867C10.0579 17.7867 9.90093 17.7447 9.76259 17.6648V17.6638Z" fill="#DADADA" />
            </svg>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <div className="h-7 w-7 overflow-hidden rounded-full border border-[#DADADA]">
              <Image src="/icons/instagram.png" alt="Profile" width={28} height={28} className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function TwitterPostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const text = (content.post || content.caption || "").toString();

  return (
    <PhoneShell className="max-w-[600px]">
      <div className="p-4">
        <div className="flex items-start gap-2 opacity-80">
          <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border">
            <Image src="/icons/twitter.png" alt="X" fill sizes="32px" className="object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-5 font-semibold text-foreground/20">Account Name</p>
            <p className="text-[15px] leading-5 text-muted-foreground/20">@AccountName</p>
          </div>

          <MoreHorizontal className="mt-1 h-[19px] w-[19px] shrink-0 text-muted-foreground/40" />
        </div>

        <div className="mt-3">
          <p className="whitespace-pre-wrap text-[17px] leading-6 text-foreground">{text || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris."}</p>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="grid grid-cols-4">
            <div className="flex items-center justify-center text-muted-foreground/40">
              <MessageCircle className="h-[22px] w-[22px]" />
            </div>
            <div className="flex items-center justify-center text-muted-foreground/40">
              <Repeat2 className="h-[22px] w-[22px]" />
            </div>
            <div className="flex items-center justify-center text-muted-foreground/40">
              <Heart className="h-[22px] w-[22px]" />
            </div>
            <div className="flex items-center justify-center text-muted-foreground/40">
              <Share2 className="h-[22px] w-[22px]" />
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function LinkedInPostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const imageText = (content.image_description || content.visual_description || "").toString();
  const caption = (content.caption || content.post || "").toString();
  const hashtags = getHashtags(content);

  return (
    <div className="mx-auto flex w-full max-w-[367px] flex-col rounded-lg border border-[#EBEBEB] bg-background">
      <div className="flex items-center gap-2 p-4">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
          <Image src="/icons/linkedin.png" alt="LinkedIn" fill sizes="40px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] leading-5 font-bold text-[#DADADA]">Account Name</p>
        </div>
        <MoreHorizontal className="h-6 w-6 text-[#DADADA]" />
      </div>

      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-[13.5px] leading-5 text-[#262626]">
          {caption || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris."}
        </p>
      </div>

      {hashtags.length > 0 ? (
        <div className="flex items-center justify-center px-4 pb-3">
          <p className="w-full text-[13.5px] leading-5 text-[#00F]">
            {hashtags.map((tag) => `#${tag}`).join(" ")}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center px-4 pb-3">
          <p className="w-full text-[13.5px] leading-5 text-[#00F]">
            #Loremipsum #consectetur #Loremipsum #consectetur
          </p>
        </div>
      )}

      <div className="relative h-[265px] w-full overflow-hidden">
        <Image src="/checkers.png" alt="" fill className="object-cover" />
        <div className="absolute left-1/2 top-1/2 w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-2.5">
          <p className="text-center text-[13.5px] leading-5 text-[#262626]">
            Image Text Suggestion: {imageText || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna."}
          </p>
        </div>
      </div>

      <div className="h-px w-full">
        <div className="h-px w-full bg-[#EBEBEB]" />
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col items-center px-4 py-2.5">
          <ThumbsUp className="h-6 w-6 text-[#DADADA]" />
          <span className="text-center text-[14px] font-medium leading-7 text-[#DADADA]">Like</span>
        </div>
        <div className="flex flex-col items-center px-4 py-2.5">
          <MessageCircle className="h-6 w-6 text-[#DADADA]" />
          <span className="text-center text-[14px] font-medium leading-7 text-[#DADADA]">Comment</span>
        </div>
        <div className="flex flex-col items-center px-4 py-2.5">
          <Repeat2 className="h-6 w-6 text-[#DADADA]" />
          <span className="text-center text-[14px] font-medium leading-7 text-[#DADADA]">Repost</span>
        </div>
        <div className="flex flex-col items-center px-4 py-2.5">
          <Send className="h-6 w-6 text-[#DADADA]" />
          <span className="text-center text-[14px] font-medium leading-7 text-[#DADADA]">Send</span>
        </div>
      </div>
    </div>
  );
}

export function FacebookPostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const imageText = (content.image_description || content.visual_description || "").toString();
  const caption = (content.caption || content.post || "").toString();
  const hashtags = getHashtags(content);

  return (
    <div className="mx-auto flex w-full max-w-[367px] flex-col rounded-lg border border-[#EBEBEB] bg-background">
      <div className="flex items-center gap-2 p-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
          <Image src="/icons/facebook.png" alt="Profile" fill sizes="40px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-bold leading-5 text-[#DADADA]">Account Name</p>
        </div>
        <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 12C14 12.3956 13.8827 12.7822 13.6629 13.1111C13.4432 13.44 13.1308 13.6964 12.7654 13.8478C12.3999 13.9991 11.9978 14.0387 11.6098 13.9616C11.2219 13.8844 10.8655 13.6939 10.5858 13.4142C10.3061 13.1345 10.1156 12.7781 10.0384 12.3902C9.96126 12.0022 10.0009 11.6001 10.1522 11.2346C10.3036 10.8692 10.56 10.5568 10.8889 10.3371C11.2178 10.1173 11.6044 10 12 10C12.5304 10 13.0391 10.2107 13.4142 10.5858C13.7893 10.9609 14 11.4696 14 12ZM4 10C3.60444 10 3.21776 10.1173 2.88886 10.3371C2.55996 10.5568 2.30362 10.8692 2.15224 11.2346C2.00087 11.6001 1.96126 12.0022 2.03843 12.3902C2.1156 12.7781 2.30608 13.1345 2.58579 13.4142C2.86549 13.6939 3.22186 13.8844 3.60982 13.9616C3.99778 14.0387 4.39992 13.9991 4.76537 13.8478C5.13082 13.6964 5.44318 13.44 5.66294 13.1111C5.8827 12.7822 6 12.3956 6 12C6 11.4696 5.78929 10.9609 5.41421 10.5858C5.03914 10.2107 4.53043 10 4 10ZM20 10C19.6044 10 19.2178 10.1173 18.8889 10.3371C18.56 10.5568 18.3036 10.8692 18.1522 11.2346C18.0009 11.6001 17.9613 12.0022 18.0384 12.3902C18.1156 12.7781 18.3061 13.1345 18.5858 13.4142C18.8655 13.6939 19.2219 13.8844 19.6098 13.9616C19.9978 14.0387 20.3999 13.9991 20.7654 13.8478C21.1308 13.6964 21.4432 13.44 21.6629 13.1111C21.8827 12.7822 22 12.3956 22 12C22 11.4696 21.7893 10.9609 21.4142 10.5858C21.0391 10.2107 20.5304 10 20 10Z" fill="#DADADA" />
        </svg>
      </div>

      <div className="px-3 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-5 text-[#262626]">
          {caption || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris."}
        </p>
      </div>

      {hashtags.length > 0 ? (
        <div className="flex items-center justify-center px-3 pb-3">
          <p className="text-sm leading-5 text-[#00F]">
            {hashtags.map((tag) => `#${tag}`).join(" ")}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center px-3 pb-3">
          <p className="text-sm leading-5 text-[#00F]">
            #Loremipsum #consectetur #Loremipsum #consectetur
          </p>
        </div>
      )}

      <div className="relative h-[265px] w-full overflow-hidden">
        <Image src="/checkers.png" alt="" fill className="object-cover" />
        <div className="absolute left-1/2 top-1/2 flex w-[180px] -translate-x-1/2 -translate-y-1/2 items-center bg-background justify-center rounded-lg">
          <p className="text-center text-sm leading-5 text-[#262626]">
            Image Text Suggestion: {imageText || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna."}
          </p>
        </div>
      </div>

      <div className="flex h-px flex-col items-center">
        <div className="h-px w-[335px] bg-border" />
      </div>

      <div className="flex items-end justify-between p-3">
        <div className="flex flex-col items-center">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_like)">
              <path fillRule="evenodd" clipRule="evenodd" d="M12.6901 9.5H5.06012C4.58877 9.55997 4.16024 9.80389 3.86801 10.1785C3.57577 10.5532 3.44353 11.0282 3.50012 11.5C3.53076 11.9138 3.71898 12.3 4.02597 12.5791C4.33296 12.8582 4.73533 13.0088 5.15012 13H5.44012C5.07937 13.0105 4.73706 13.1618 4.48657 13.4216C4.23609 13.6815 4.09736 14.0291 4.10012 14.39C4.10136 14.7476 4.23657 15.0918 4.47906 15.3547C4.72156 15.6175 5.05375 15.78 5.41012 15.81C5.18697 15.9746 5.01689 16.201 4.9209 16.4611C4.8249 16.7213 4.80718 17.0039 4.86992 17.274C4.93267 17.5441 5.07313 17.79 5.27397 17.9812C5.47482 18.1724 5.72725 18.3006 6.00012 18.35C5.83175 18.6545 5.77851 19.0095 5.85012 19.35C5.93812 19.6799 6.13532 19.9703 6.40956 20.1737C6.6838 20.3771 7.01888 20.4815 7.36013 20.47H11.4401C11.9664 20.4688 12.4905 20.4016 13.0001 20.27L15.5601 19.52H18.9401C20.7201 19.45 21.2001 11.26 18.9401 11.26H17.9401C17.7701 11.26 17.6701 10.92 17.2301 10.44C16.5801 9.73 15.8401 8.82 15.3201 8.31C14.0718 7.21355 13.0523 5.88141 12.3201 4.39C11.9001 3.42 11.8501 3 11.0001 3C10.6519 3.04262 10.333 3.21626 10.1082 3.4856C9.88348 3.75495 9.76973 4.09979 9.79012 4.45C9.79012 4.7 9.92013 5.57 9.97013 5.88C10.3202 7.188 10.9176 8.41682 11.7301 9.5" fill="#DADADA" />
              <path d="M5.05975 10C4.85493 9.97932 4.64806 10.0034 4.45348 10.0706C4.25889 10.1378 4.08125 10.2465 3.93286 10.3892C3.78446 10.5319 3.66887 10.7052 3.59408 10.897C3.5193 11.0888 3.48711 11.2945 3.49975 11.5C3.52554 11.9156 3.71231 12.3047 4.0204 12.5848C4.32848 12.8649 4.73361 13.0138 5.14975 13H5.43975C5.25896 13.0039 5.08073 13.0435 4.91534 13.1166C4.74994 13.1897 4.60065 13.2948 4.47608 13.4259C4.35151 13.557 4.25412 13.7114 4.18953 13.8803C4.12494 14.0492 4.09443 14.2292 4.09975 14.41C4.10099 14.7676 4.23619 15.1118 4.47869 15.3747C4.72119 15.6375 5.05338 15.8 5.40975 15.83C5.18659 15.9746 5.01652 16.221 4.92052 16.4811C4.82452 16.7413 4.8068 17.0239 4.86955 17.294C4.93229 17.5641 5.07275 17.81 5.2736 18.0012C5.47444 18.1924 5.72688 18.3206 5.99975 18.37C5.83138 18.6745 5.77814 19.0295 5.84975 19.37C5.93944 19.7017 6.13815 19.9935 6.41388 20.1985C6.68961 20.4035 7.02631 20.5097 7.36975 20.5H11.4497C11.9728 20.4899 12.4929 20.4194 12.9997 20.29L15.5597 19.54H18.9397C20.7197 19.47 21.1997 11.28 18.9397 11.28H17.9397C17.7697 11.28 17.6697 10.94 17.2297 10.46C16.5797 9.75 15.8397 8.84 15.3197 8.33C14.0715 7.23355 13.052 5.90141 12.3197 4.41C11.8997 3.44 11.8497 3 10.9997 3C10.8233 3.0133 10.6514 3.06278 10.4948 3.14535C10.3383 3.22793 10.2004 3.34184 10.0897 3.48C9.97438 3.61753 9.88826 3.77714 9.83668 3.94908C9.7851 4.12102 9.76913 4.30168 9.78975 4.48C9.78975 4.73 9.91975 5.6 9.96975 5.91C10.3607 7.34949 10.9532 8.72646 11.7297 10H5.05975Z" stroke="#DADADA" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <defs>
              <clipPath id="clip0_like">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span className="text-center text-sm font-medium leading-7 text-[#DADADA]">Like</span>
        </div>

        <div className="flex flex-col items-center">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 9H17V10H7V9ZM7 13H14V12H7V13ZM23 11C23.0148 12.0949 22.7643 13.1772 22.2697 14.1541C21.7751 15.1311 21.0512 15.9738 20.16 16.61L12 22V18H8C6.14348 18 4.36301 17.2625 3.05025 15.9497C1.7375 14.637 1 12.8565 1 11C1 9.14348 1.7375 7.36301 3.05025 6.05025C4.36301 4.7375 6.14348 4 8 4H16C17.8565 4 19.637 4.7375 20.9497 6.05025C22.2625 7.36301 23 9.14348 23 11ZM21 11C21 9.67392 20.4732 8.40215 19.5355 7.46447C18.5979 6.52678 17.3261 6 16 6H8C6.67392 6 5.40215 6.52678 4.46447 7.46447C3.52678 8.40215 3 9.67392 3 11C3 12.3261 3.52678 13.5979 4.46447 14.5355C5.40215 15.4732 6.67392 16 8 16H14V18.28L19 15C19.6336 14.5463 20.1469 13.9448 20.4955 13.2477C20.844 12.5507 21.0172 11.7791 21 11Z" fill="#DADADA" />
          </svg>
          <span className="text-center text-sm font-medium leading-7 text-[#DADADA]">Comment</span>
        </div>

        <div className="flex flex-col items-center">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.96 5H6C5.45 5 5 5.45 5 6V16H3V6C3 4.34 4.34 3 6 3H13.96L12 0H14.37L17 4L14.37 8H12L13.96 5ZM19.5 8H19V18C19 18.55 18.55 19 18 19H10.04L12 16H9.63L7 20L9.63 24H12L10.04 21H18C19.66 21 21 19.66 21 18V8H19.5Z" fill="#DADADA" />
          </svg>
          <span className="text-center text-sm font-medium leading-7 text-[#DADADA]">Repost</span>
        </div>

        <div className="flex flex-col items-center">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 3L0 10L7.66 14.26L16 8L9.74 16.34L14 24L21 3Z" fill="#DADADA" />
          </svg>
          <span className="text-center text-sm font-medium leading-7 text-[#DADADA]">Send</span>
        </div>
      </div>
    </div>
  );
}

export function TikTokPostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const videoContent = (content.video_script || content.video_description || content.post || "").toString();
  const caption = (content.caption || content.post || "").toString();
  const hashtags = getHashtags(content);

  return (
    <PhoneShell className="max-w-[380px] h-[700px] bg-foreground/60 text-background flex flex-col">
      <div className="opacity-30">
        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
          <span className="tracking-[-0.3px]">9:41</span>
          <span className="text-xs">◦◦◦</span>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 pb-2">
          <span className="text-[16px] text-background/60">Following</span>
          <span className="text-background/60">|</span>
          <span className="text-[18px] font-semibold">For You</span>
        </div>
      </div>

      <div className="relative flex-1 px-4 pb-4">
        <div className="absolute right-3 bottom-[120px] flex w-[50px] flex-col items-center gap-6 opacity-30">
          <User className="h-12 w-12" />
          <Heart className="h-9 w-9" />
          <MessageCircle className="h-9 w-9" />
          <Share2 className="h-9 w-9" />
        </div>

        <div className="pt-6">
          <div className="mx-auto w-full max-w-[280px] rounded-lg bg-background/10 p-3 border border-white/10">
            <p className="text-center text-[14px] font-semibold text-background">Video Script</p>
            <div className="mt-2 h-[150px] overflow-auto">
              <p className="whitespace-pre-wrap text-[13.5px] leading-5 text-background/90">
                {videoContent || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pr-[60px]">
          <p className="text-[17px] font-semibold">@account_name</p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[19.5px] text-background/90">
            {caption || "-"}{" "}
            {hashtags.length ? (
              <span className="font-semibold text-background">{hashtags.map((t) => `#${t}`).join(" ")}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="bg-background/10 px-7 py-3 opacity-30 shrink-0">
        <div className="flex items-center justify-between text-background">
          <div className="flex flex-col items-center gap-1">
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Discover</span>
          </div>
          <PlusSquare className="h-7 w-7" />
          <div className="flex flex-col items-center gap-1">
            <Inbox className="h-5 w-5" />
            <span className="text-[10px]">Inbox</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <User className="h-5 w-5" />
            <span className="text-[10px]">Me</span>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function YouTubePostPreview({ content }: { content: SocialContentLikeOldUI }) {
  const thumbnail = (content.thumbnail_description || content.image_description || "").toString();
  const video = (content.video_script || content.video_description || content.post || "").toString();
  const title = (content.caption || content.video_description || content.post || "").toString();
  const hashtags = getHashtags(content);

  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-col gap-[5px] rounded-lg bg-background">
      <div className="flex h-[31px] items-center justify-between px-[18px] text-xs text-[#8E8E8E]">
        <span>9:41</span>
        <span>◦◦◦</span>
      </div>

      <div className="relative h-[248px] w-full overflow-hidden">
        <Image src="/checkers.png" alt="" fill className="object-cover" />
        <div className="absolute inset-0 flex gap-2.5 px-4 py-0 items-center justify-center">
          <div className="flex-1 rounded-lg bg-background p-2.5 max-h-[200px] overflow-y-auto">
            <p className="text-center text-[13.5px] leading-5 text-[#262626]">
              Thumbnail Image Suggestion: {thumbnail || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi."}
            </p>
          </div>
          <div className="flex-1 rounded-lg bg-background p-2.5 max-h-[200px] overflow-y-auto">
            <p className="text-center text-[13.5px] leading-5 text-[#262626]">
              Video Content Suggestion: {video || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5 px-0 py-4">
        <div className="flex items-center gap-2.5 px-4">
          <div className="relative h-[27px] w-[26px] shrink-0 overflow-hidden rounded-full border border-[#E5E5E5]">
            <Image src="/icons/youtube.png" alt="Profile" fill sizes="26px" className="object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] leading-5 text-[#DADADA]">Account Name</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4">
          <p className="text-[14px] leading-5 font-bold text-[#262626]">
            {title || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce eleifend sit amet ligula ac tincidunt."}
          </p>
          <p className="text-[12px] leading-normal text-[#00F]">
            @accounthandle{hashtags.length ? " " : ""}{hashtags.map((t) => `#${t}`).join(" ") || "#hashtag #hashtag"}
          </p>
        </div>

        <div className="flex items-center gap-3 px-4">
          <div className="flex items-center gap-3 rounded-[17.5px] bg-[#F2F2F2] px-[13px] py-[7px]">
            <ThumbsUp className="h-[21px] w-[21px] rotate-180 text-[#DADADA]" />
            <span className="text-[14px] leading-none text-[#DADADA]">Like</span>
            <div className="h-[21px] w-px bg-[#DADADA]" />
            <ThumbsDown className="h-[21px] w-[21px] text-[#DADADA]" />
          </div>
          <div className="flex items-center gap-2 rounded-[17.5px] bg-[#F2F2F2] px-[14px] py-[10px]">
            <Share2 className="h-[14px] w-[16px] text-[#DADADA]" />
            <span className="text-[12px] leading-none text-[#DADADA]">Share</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-[17.5px] bg-[#F2F2F2] px-[13px] py-0">
            <Download className="h-[34px] w-[20px] text-[#DADADA]" />
            <span className="text-[12px] leading-none text-[#DADADA]">Download</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialChannelPreview({
  channel,
  content,
  isLoading = false
}: {
  channel: SocialChannel;
  content: SocialContentLikeOldUI;
  isLoading?: boolean;
}) {
  const ch = normalizeChannel(channel);

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-[390px] items-center justify-center rounded-lg bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (ch.includes("instagram")) return <InstagramPostPreview content={content} />;
  if (ch.includes("linkedin")) return <LinkedInPostPreview content={content} />;
  if (ch.includes("facebook")) return <FacebookPostPreview content={content} />;
  if (ch.includes("reddit")) {
    const postTitle = (content.post_title || content.title || "").toString();
    const postBody = (content.post_body || content.post || content.caption || "").toString();

    return (
      <PhoneShell className="max-w-[420px] border border-border">
        <div className="flex items-center gap-2 p-4">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
            <Image src="/icons/reddit.png" alt="Reddit" fill sizes="40px" className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] leading-5 font-semibold text-muted-foreground/40">r/accountname</p>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="px-4 pb-4 flex flex-col gap-3">
          {postTitle && (
            <h3 className="text-[16px] leading-6 font-semibold text-foreground hover:text-primary cursor-pointer">
              {postTitle}
            </h3>
          )}
          {postBody && (
            <p className="whitespace-pre-wrap text-[14px] leading-5 text-foreground/80">{postBody}</p>
          )}
          {!postTitle && !postBody && (
            <p className="text-[14px] leading-5 text-muted-foreground">-</p>
          )}
        </div>
      </PhoneShell>
    );
  }
  if (ch.includes("tiktok")) return <TikTokPostPreview content={content} />;
  if (ch.includes("youtube")) return <YouTubePostPreview content={content} />;
  if (ch.includes("twitter")) return <TwitterPostPreview content={content} />;

  return <LinkedInPostPreview content={content} />;
}

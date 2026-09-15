"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { cn } from "@/lib/utils";
import styles from "./agent.module.css";

/** One input instance, with only a visual translation between settled layouts. */
export function AgentComposerDock({ centered, children, chatKey }: { centered: boolean; children: ReactNode; chatKey: string }) {
  const element = useRef<HTMLDivElement>(null);
  const previous = useRef<{ top: number; left: number; centered: boolean; key: string } | null>(null);
  const animation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const el = element.current;
    if (!el) return;
    animation.current?.cancel();
    const rect = el.getBoundingClientRect();
    const last = previous.current;
    if (last && last.centered !== centered && last.key === chatKey && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation.current = el.animate([{ transform: `translate(${last.left - rect.left}px, ${last.top - rect.top}px)` }, { transform: "translate(0, 0)" }], { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
    if ((!last || last.key !== chatKey) && centered && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation.current = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    }
    previous.current = { top: rect.top, left: rect.left, centered, key: chatKey };
  }, [centered, chatKey]);
  useLayoutEffect(() => {
    const el = element.current;
    if (!el) return;
    const update = () => {
      if (animation.current?.playState === "running") return;
      const rect = el.getBoundingClientRect();
      previous.current = { top: rect.top, left: rect.left, centered, key: chatKey };
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) animation.current?.cancel(); };
    media.addEventListener("change", stop);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); media.removeEventListener("change", stop); };
  }, [centered, chatKey]);
  useLayoutEffect(() => () => animation.current?.cancel(), []);
  return <div className={cn(centered ? styles.composerCentered : "shrink-0 px-4 pb-4")}>
    <div ref={element} className="relative mx-auto w-full max-w-3xl">
      <div aria-hidden={!centered} className={cn(styles.welcomeHeading, !centered && styles.welcomeHidden)}><MassicAmoebaLoader size={28} animate={false} /><h1 className="text-2xl font-medium tracking-tight">Ask Me Anything</h1></div>
      {children}
    </div>
  </div>;
}

"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./agent.module.css";

/**
 * Keep the last chip content only for its brief exit, outside the tab order.
 * `initialVisible` lets a freshly mounted row animate from a previous screen's state.
 */
export function AgentComposerRow({ visible, initialVisible = visible, children }: { visible: boolean; initialVisible?: boolean; children: ReactNode }) {
  const last = useRef(children);
  const [entered, setEntered] = useState(initialVisible === visible);
  useLayoutEffect(() => { if (visible) last.current = children; }, [visible, children]);
  useEffect(() => {
    if (entered) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [entered]);
  const open = entered ? visible : initialVisible;
  return <div className={styles.composerRow} data-open={open} aria-hidden={!open} inert={!open}>
    <div className="min-h-0 overflow-hidden">{visible ? children : last.current}</div>
  </div>;
}

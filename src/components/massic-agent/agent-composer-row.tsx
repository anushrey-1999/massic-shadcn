"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./agent.module.css";

/** Keep the last chip content only for its brief exit, outside the tab order. */
export function AgentComposerRow({ visible, children }: { visible: boolean; children: ReactNode }) {
  const last = useRef(children);
  useLayoutEffect(() => { if (visible) last.current = children; }, [visible, children]);
  return <div className={styles.composerRow} data-open={visible} aria-hidden={!visible} inert={!visible}>
    <div className="min-h-0 overflow-hidden">{visible ? children : last.current}</div>
  </div>;
}

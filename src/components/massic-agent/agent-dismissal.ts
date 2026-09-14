/** Radix handles Escape for its topmost layer before the workspace does. */
export function canDismissPlan(event: Pick<KeyboardEvent, "key" | "isComposing" | "defaultPrevented">, overlayOpen: boolean) {
  return event.key === "Escape" && !event.isComposing && !event.defaultPrevented && !overlayOpen;
}

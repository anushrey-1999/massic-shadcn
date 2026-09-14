/** Bounded publication of accumulated text; terminal events always flush. */
export function createStreamPublisher(publish: () => void, clock = {
  now: () => performance.now(),
  frame: (fn: FrameRequestCallback) => requestAnimationFrame(fn),
  cancel: (id: number) => cancelAnimationFrame(id),
}) {
  let frame: number | null = null;
  let last = -Infinity;
  let dirty = false;
  const flush = () => {
    if (frame !== null) clock.cancel(frame);
    frame = null;
    if (!dirty) return;
    dirty = false;
    last = clock.now();
    publish();
  };
  const tick = () => {
    frame = null;
    if (clock.now() - last >= 32) flush();
    else frame = clock.frame(tick);
  };
  return {
    schedule(immediate = false) {
      dirty = true;
      if (immediate) flush();
      else if (frame === null) frame = clock.frame(tick);
    },
    flush,
    cancel() { if (frame !== null) clock.cancel(frame); frame = null; dirty = false; },
  };
}

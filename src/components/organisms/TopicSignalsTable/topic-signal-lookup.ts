import type { TopicSignalRow } from "@/types/topic-signals-types";

/** Signals are matched to topics by name because the signals API does not expose topic ids. */
export function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

export function buildSignalsByTopic(
  signals: TopicSignalRow[]
): Record<string, TopicSignalRow> {
  const map: Record<string, TopicSignalRow> = {};
  for (const signal of signals) {
    if (!signal.topic) continue;
    map[normalizeTopicKey(signal.topic)] = signal;
  }
  return map;
}

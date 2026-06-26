import { Index } from "flexsearch";

type SearchOption = {
  value: string;
  label: string;
};

type InitMessage = {
  type: "init";
  requestId: number;
  options: SearchOption[];
};

type SearchMessage = {
  type: "search";
  requestId: number;
  query: string;
};

type WorkerRequest = InitMessage | SearchMessage;

type WorkerResponse =
  | { type: "ready"; requestId: number }
  | { type: "results"; requestId: number; indexes: number[] }
  | { type: "error"; requestId: number; message: string };

let searchIndex: Index | null = null;
let indexedOptions: SearchOption[] = [];

function postResponse(message: WorkerResponse) {
  self.postMessage(message);
}

function normalizeSearchText(text: string) {
  return text.trim().toLowerCase();
}

function buildSearchText(option: SearchOption) {
  return `${option.label} ${option.value}`;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    if (message.type === "init") {
      indexedOptions = message.options;
      searchIndex = new Index({
        preset: "performance",
        tokenize: "forward",
        cache: 100,
      });

      indexedOptions.forEach((option, index) => {
        searchIndex?.add(index, buildSearchText(option));
      });

      postResponse({ type: "ready", requestId: message.requestId });
      return;
    }

    if (message.type === "search") {
      const query = normalizeSearchText(message.query);

      if (!query) {
        postResponse({
          type: "results",
          requestId: message.requestId,
          indexes: indexedOptions.map((_, index) => index),
        });
        return;
      }

      if (!searchIndex) {
        throw new Error("Location search index is not ready");
      }

      const results = searchIndex.search(query, {
        limit: indexedOptions.length,
      }) as Array<string | number>;

      postResponse({
        type: "results",
        requestId: message.requestId,
        indexes: results.map((result) => Number(result)),
      });
    }
  } catch (error) {
    postResponse({
      type: "error",
      requestId: message.requestId,
      message:
        error instanceof Error
          ? error.message
          : "Location search failed unexpectedly",
    });
  }
};

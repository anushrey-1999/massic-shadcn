function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const PERFORMANCE_REPORT_V2_EDITABLE_FIELD_PATTERNS = [
  /^plain_english_paragraph$/,
  /^plain_english_paragraph\.title$/,
  /^plain_english_paragraph\.body$/,
  /^channel_notes\.[^.]+$/,
  /^organic_page_note$/,
  /^ranking_narrative$/,
  /^review_areas\.\d+\.title$/,
  /^review_areas\.\d+\.body$/,
  /^confidence_note$/,
];

function cloneJsonObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPerformanceReportV2EditableFieldPath(path) {
  return PERFORMANCE_REPORT_V2_EDITABLE_FIELD_PATTERNS.some((pattern) => pattern.test(path));
}

function getPerformanceReportV2EditedFields(payload) {
  if (!isObject(payload) || !isObject(payload.edited_fields)) return {};

  return Object.entries(payload.edited_fields).reduce((acc, [path, value]) => {
    if (typeof value === "string" && isPerformanceReportV2EditableFieldPath(path)) {
      acc[path] = value;
    }
    return acc;
  }, {});
}

function stripPerformanceReportV2EditedFields(payload) {
  if (!isObject(payload)) return payload;

  const nextPayload = cloneJsonObject(payload);
  if (isObject(nextPayload) && Object.prototype.hasOwnProperty.call(nextPayload, "edited_fields")) {
    delete nextPayload.edited_fields;
  }
  return nextPayload;
}

function setValueAtPath(target, path, value) {
  const segments = String(path || "").split(".");
  let cursor = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsIndex = /^\d+$/.test(nextSegment || "");

    if (Array.isArray(cursor)) {
      const itemIndex = Number(segment);
      if (!Number.isInteger(itemIndex)) return;

      if (isLast) {
        cursor[itemIndex] = value;
        return;
      }

      if (
        cursor[itemIndex] === undefined ||
        cursor[itemIndex] === null ||
        (typeof cursor[itemIndex] !== "object" && !Array.isArray(cursor[itemIndex]))
      ) {
        cursor[itemIndex] = nextIsIndex ? [] : {};
      }

      cursor = cursor[itemIndex];
      continue;
    }

    if (!isObject(cursor)) return;

    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const currentValue = cursor[segment];
    if (
      currentValue === undefined ||
      currentValue === null ||
      (typeof currentValue !== "object" && !Array.isArray(currentValue))
    ) {
      cursor[segment] = nextIsIndex ? [] : {};
    }

    cursor = cursor[segment];
  }
}

function applyPerformanceReportV2EditedFields(payload) {
  if (!isObject(payload)) return payload;

  const editedFields = getPerformanceReportV2EditedFields(payload);
  const nextPayload = stripPerformanceReportV2EditedFields(payload);

  if (!isObject(nextPayload)) return nextPayload;

  for (const [path, value] of Object.entries(editedFields)) {
    setValueAtPath(nextPayload, path, value);
  }

  nextPayload.edited_fields = cloneJsonObject(editedFields);
  return nextPayload;
}

function toText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseDate(value) {
  const text = toText(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function differenceInCalendarDays(end, start) {
  return Math.round((startOfUtcDay(end) - startOfUtcDay(start)) / 86400000);
}

function subDays(date, days) {
  const clone = new Date(date.getTime());
  clone.setUTCDate(clone.getUTCDate() - days);
  return clone;
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function formatMonthDay(date) {
  return formatDate(date, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatMonthDayYear(date) {
  return formatDate(date, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatMonthYear(date) {
  return formatDate(date, { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatRange(start, end) {
  if (!start || !end) return null;
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameYear ? formatMonthDay(start) : formatMonthDayYear(start);
  return `${startLabel} - ${formatMonthDayYear(end)}`;
}

function derivePreviousRange(context) {
  const processedMeta = context.processedMeta;
  const previousStart = parseDate(processedMeta && processedMeta.previous_start);
  const previousEnd = parseDate(processedMeta && processedMeta.previous_end);
  if (previousStart && previousEnd) {
    return { start: previousStart, end: previousEnd };
  }

  const start = parseDate(context.periodStart);
  const end = parseDate(context.periodEnd);
  if (!start || !end) {
    return { start: null, end: null };
  }

  const days = differenceInCalendarDays(end, start) + 1;
  return {
    start: subDays(start, days),
    end: subDays(start, 1),
  };
}

function derivePeriodLine(context, meta) {
  const processedMeta = context.processedMeta;
  const currentStart = parseDate((processedMeta && processedMeta.current_start) || context.periodStart);
  const currentEnd = parseDate((processedMeta && processedMeta.current_end) || context.periodEnd);
  const previous = derivePreviousRange(context);
  const currentLabel = formatRange(currentStart, currentEnd) || toText(meta.period_label);
  const previousLabel = formatRange(previous.start, previous.end);

  if (currentLabel && previousLabel) return `${currentLabel} · vs ${previousLabel}`;
  return currentLabel || null;
}

function toneFromDirection(value) {
  const normalized = toText(value).toLowerCase();
  if (normalized === "up" || normalized === "positive" || normalized === "increase") return "strong";
  if (normalized === "down" || normalized === "negative" || normalized === "decrease") return "dip";
  return "neu";
}

function pillLabelFromTone(tone) {
  if (tone === "strong") return "Strong";
  if (tone === "dip") return "Dip";
  return "Stable";
}

function splitHeadline(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { title: "Performance summary", body: "" };
  }

  const match = cleaned.match(/^[^.!?]+[.!?]/);
  if (!match) {
    return { title: cleaned, body: cleaned };
  }

  const title = match[0].trim();
  const remainder = cleaned.slice(title.length).trim();
  return {
    title,
    body: remainder || cleaned,
  };
}

function metricNote(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("conversion rate")) return "Goals divided by sessions";
  if (normalized.includes("click")) return "Google Search Console";
  if (normalized.includes("session")) return "Website visits";
  if (normalized.includes("call")) return "Primary conversion event";
  return null;
}

function formatWinLine(win) {
  const label = toText(win.label);
  const value = toText(win.value);
  const context = toText(win.context) || null;
  if (!label && !value && !context) return null;
  return { label, value, context };
}

function formatChannelName(name) {
  if (name.toLowerCase() === "organic") return "Organic Search";
  if (name.toLowerCase() === "ai search") return "AI Search";
  return name;
}

function formatDeltaMetric(value) {
  const text = toText(value);
  if (!text) return null;
  let tone = "neu";
  if (text.startsWith("+")) tone = "strong";
  if (text.startsWith("-")) tone = "dip";
  return { label: "", value: text, tone };
}

function mapBusinessInsightTag(insight) {
  const pattern = toText(insight.pattern).toLowerCase();
  if (pattern.includes("new") || pattern.includes("emerging")) return "Emerging signal";
  if (pattern.includes("demand") || pattern.includes("high impression")) return "Demand signal";
  if (pattern.includes("segment")) return "Audience signal";
  return "Search insight";
}

function normalizeReportInput(input) {
  if (isObject(input)) return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return isObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function unwrapNamedOutput(value, key) {
  if (!isObject(value)) return {};
  if (isObject(value[key])) return value[key];
  return value;
}

function getProseOutput(context) {
  return unwrapNamedOutput(context.llmOutputs && context.llmOutputs.prose, "prose");
}

function getReviewInsightsOutput(context) {
  return unwrapNamedOutput(context.llmOutputs && context.llmOutputs.review_insights, "review_insights");
}

function getBusinessIntelligenceOutput(context) {
  return unwrapNamedOutput(context.llmOutputs && context.llmOutputs.business_intelligence, "business_intelligence");
}

function pickText() {
  for (const value of arguments) {
    const text = toText(value);
    if (text) return text;
  }
  return "";
}

function normalizeReviewThemes(source, titleKey, bodyKey) {
  return asArray(source)
    .map((item) => {
      const title = toText(item[titleKey]);
      const body = toText(item[bodyKey]);
      return title && body ? { title, body } : null;
    })
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlParagraphs(text) {
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("");
}

function mapPerformanceReportV2Template(input, context = {}) {
  const normalizedReport = normalizeReportInput(input);
  if (!normalizedReport) return null;
  const proseOutput = getProseOutput(context);

  if (
    Array.isArray(normalizedReport.review_areas) &&
    normalizedReport.review_areas.length === 0 &&
    Array.isArray(proseOutput.review_areas) &&
    proseOutput.review_areas.length > 0
  ) {
    normalizedReport.review_areas = cloneJsonObject(proseOutput.review_areas);
  }

  const report = applyPerformanceReportV2EditedFields(normalizedReport);
  const reviewInsightsOutput = getReviewInsightsOutput(context);
  const businessIntelligenceOutput = getBusinessIntelligenceOutput(context);

  const meta = isObject(report.meta) ? report.meta : {};
  const flags = isObject(report.flags) ? report.flags : {};
  const businessName = toText(meta.business_name) || toText(context.businessName) || "Business";
  const agencyName = toText(meta.agency_name) || "MASSIC";
  const windowDaysMatch = context.period ? context.period.match(/\d+/) : null;
  const windowDays = Number(meta.window_days || (windowDaysMatch ? windowDaysMatch[0] : 0));
  const reportTag = windowDays > 0 ? `${windowDays}-Day Report` : "Performance Report";

  const contextFlag = toText(flags.context_flag);
  const baselinePhrase = toText(flags.baseline_phrase);
  const notices = [];

  if (contextFlag === "ANOMALOUS_COMPARISON") {
    notices.push({
      kind: "context",
      icon: "i",
      body:
        "The prior period had unusual activity patterns. The seasonal baseline is the more reliable benchmark for this report.",
    });
  } else if (contextFlag) {
    notices.push({
      kind: "context",
      icon: "i",
      body: contextFlag.replace(/_/g, " "),
    });
  }

  if (baselinePhrase) {
    notices.push({
      kind: "baseline",
      icon: "+",
      body: `Performance is ${baselinePhrase}.`,
    });
  }

  const headlineParagraph = pickText(report.plain_english_paragraph, proseOutput.plain_english_paragraph);
  const ef = isObject(report.edited_fields) ? report.edited_fields : {};
  const efTitle = typeof ef["plain_english_paragraph.title"] === "string" ? ef["plain_english_paragraph.title"] : "";
  const efBody = typeof ef["plain_english_paragraph.body"] === "string" ? ef["plain_english_paragraph.body"] : "";
  const headline = headlineParagraph
    ? (efTitle || efBody)
      ? { title: efTitle || splitHeadline(headlineParagraph).title, body: efBody || splitHeadline(headlineParagraph).body }
      : splitHeadline(headlineParagraph)
    : null;

  const wins = asArray(report.wins).map(formatWinLine).filter(Boolean);

  const metricCards = asArray(report.metric_cards)
    .map((card, index) => {
      const label = toText(card.label);
      const value = toText(card.value_formatted);
      const delta = toText(card.delta_formatted);
      if (!label || !value) return null;
      return {
        label,
        value,
        delta,
        note: metricNote(label),
        tone: toneFromDirection(card.direction),
        primary: index === 0,
      };
    })
    .filter(Boolean);

  const channelNotes =
    isObject(report.channel_notes) && Object.keys(report.channel_notes).length
      ? report.channel_notes
      : isObject(proseOutput.channel_notes)
        ? proseOutput.channel_notes
        : {};

  const channels = asArray(report.channels)
    .map((channel) => {
      const rawName = toText(channel.name);
      if (!rawName) return null;
      const tone = toneFromDirection(channel.direction);
      const stats = [
        { label: toText(channel.goals_label) || "Goals", value: toText(channel.goals_value) },
        { label: toText(channel.sessions_label) || "Sessions", value: toText(channel.sessions_value) },
        { label: "Clicks", value: toText(channel.clicks_value) },
      ].filter((item) => item.value);

      return {
        name: formatChannelName(rawName),
        note: toText(channelNotes[rawName]) || null,
        tone,
        pillLabel: pillLabelFromTone(tone),
        stats,
      };
    })
    .filter(Boolean);

  const gbp =
    Boolean(flags.show_gbp) && isObject(report.gbp)
      ? {
          tone: "strong",
          metrics: [
            { key: "calls", label: "Phone calls" },
            { key: "profile_views", label: "Profile views" },
            { key: "website_clicks", label: "Website clicks" },
            { key: "directions", label: "Direction requests" },
          ]
            .map(({ key, label }) => {
              const value = isObject(report.gbp) && isObject(report.gbp[key]) ? report.gbp[key] : null;
              if (!isObject(value)) return null;
              const delta = toText(value.delta_formatted);
              return {
                label,
                value: toText(value.current),
                delta: delta ? `${delta} vs prior` : "",
                tone: toneFromDirection(value.direction || delta),
              };
            })
            .filter(Boolean),
          reviewsLine: (() => {
            const reviews = isObject(report.gbp) && isObject(report.gbp.reviews) ? report.gbp.reviews : null;
            if (!reviews) return null;
            const parts = [];
            const newCount = toText(reviews.new_this_period);
            const avgRating = toText(reviews.average_rating);
            const total = toText(reviews.total);
            if (newCount) parts.push(`${newCount} new reviews`);
            if (avgRating) parts.push(`${avgRating}★ overall`);
            if (total) parts.push(`${total} total`);
            return parts.join(" · ");
          })(),
        }
      : null;

  const normalizedReviewInsightsSource =
    isObject(report.review_insights) && Object.keys(report.review_insights).length
      ? report.review_insights
      : reviewInsightsOutput;

  const reviewInsights = (() => {
    if (!isObject(normalizedReviewInsightsSource) || !gbp) return null;

    const summary = isObject(normalizedReviewInsightsSource.review_summary)
      ? normalizedReviewInsightsSource.review_summary
      : null;
    const summaryCountRaw = summary ? Number(summary.count) : NaN;
    const summaryCount = Number.isFinite(summaryCountRaw) ? summaryCountRaw : null;
    const summaryLabel = summaryCount && summaryCount > 0
      ? [
          `${summaryCount} reviews analysed`,
          toText(summary.avg_rating) ? `${toText(summary.avg_rating)}★ average` : "",
          toText(summary.period_label),
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
    const positives = normalizeReviewThemes(normalizedReviewInsightsSource.positives, "theme", "insight");
    const watchAreas = normalizeReviewThemes(normalizedReviewInsightsSource.watch_areas, "theme", "insight");

    if (!summaryLabel && !positives.length && !watchAreas.length) return null;

    return {
      summary: summaryLabel,
      positives,
      watchAreas,
    };
  })();

  const normalizedBusinessIntelligenceSource =
    isObject(report.business_intelligence) && Object.keys(report.business_intelligence).length
      ? report.business_intelligence
      : businessIntelligenceOutput;

  const businessIntelligence = isObject(normalizedBusinessIntelligenceSource)
    ? asArray(normalizedBusinessIntelligenceSource.insights)
        .map((item) => {
          const title = toText(item.title);
          const body = toText(item.body);
          if (!title || !body) return null;
          return {
            tag: mapBusinessInsightTag(item),
            title,
            body,
          };
        })
        .filter(Boolean)
    : [];

  const organicPageNote = pickText(report.organic_page_note, proseOutput.organic_page_note) || null;

  const organicPagesRows = asArray(report.organic_pages)
    .map((page) => {
      const url = toText(page.url);
      if (!url) return null;
      const metrics = [
        { label: "Goals", value: toText(page.goals) },
        { label: "Sessions", value: toText(page.sessions) },
        { label: "Clicks", value: toText(page.clicks) },
      ]
        .map((metric) => {
          const formatted = formatDeltaMetric(metric.value);
          return formatted ? { ...formatted, label: metric.label } : null;
        })
        .filter(Boolean);

      return {
        url,
        note: null,
        metrics,
      };
    })
    .filter(Boolean);

  if (organicPageNote && organicPagesRows.length) {
    const metricScore = (row) =>
      row.metrics.reduce((sum, metric) => {
        const value = Number(String(metric.value).replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(value)) return sum;
        return sum + (metric.tone === "strong" ? value : metric.tone === "dip" ? -Math.abs(value) : 0);
      }, 0);

    const targetIndex = organicPagesRows.reduce((bestIndex, row, index) => {
      return metricScore(row) > metricScore(organicPagesRows[bestIndex]) ? index : bestIndex;
    }, 0);

    organicPagesRows[targetIndex] = { ...organicPagesRows[targetIndex], note: organicPageNote };
  }

  const biggestMovers = asArray(report.biggest_movers)
    .map((item) => {
      const query = toText(item.query);
      const improvement = toText(item.position_improvement);
      const current = toText(item.position_current);
      if (!query || !improvement) return null;
      const suffix = current ? ` -> now #${current}` : "";
      return {
        query,
        value: `↑ ${improvement} spots${suffix}`,
        tone: "strong",
      };
    })
    .filter(Boolean);

  const newRankings = asArray(report.new_rankings)
    .map((item) => {
      const query = toText(item.query);
      const position = toText(item.position);
      const impressions = toText(item.impressions);
      if (!query) return null;
      const details = [position ? `#${position}` : "", impressions ? `${impressions} appearances` : ""]
        .filter(Boolean)
        .join(" · ");
      return {
        query,
        value: details,
        tone: "neu",
      };
    })
    .filter(Boolean);

  const rankingNarrative = pickText(report.ranking_narrative, proseOutput.ranking_narrative);

  const rankings =
    biggestMovers.length || newRankings.length || toText(report.ranking_summary_sentence) || rankingNarrative
      ? {
          subtitle: rankingNarrative || null,
          summary: toText(report.ranking_summary_sentence) || null,
          biggestMovers,
          newRankings,
        }
      : null;

  const reviewAreas = asArray(asArray(report.review_areas).length ? report.review_areas : proseOutput.review_areas)
    .map((item) => {
      const title = toText(item.title);
      const body = toText(item.body);
      return title && body ? { title, body } : null;
    })
    .filter(Boolean);

  const confidenceNote = pickText(report.confidence_note, proseOutput.confidence_note) || null;

  const generatedAt = parseDate(meta.generated_at || context.createdAt);
  const footerLabel = toText(meta.period_label) || (generatedAt ? formatMonthYear(generatedAt) : "");
  const footer = footerLabel ? `Prepared by ${agencyName} · ${footerLabel}` : `Prepared by ${agencyName}`;

  return {
    header: {
      agencyName,
      businessName,
      periodLine: derivePeriodLine(context, meta),
      reportTag,
    },
    notices,
    headline,
    wins,
    metricCards,
    channels,
    gbp,
    reviewInsights,
    businessIntelligence,
    organicPages: organicPagesRows.length
      ? {
          note: null,
          rows: organicPagesRows,
        }
      : null,
    rankings,
    reviewAreas,
    confidenceNote,
    footer,
  };
}

function renderNotices(model) {
  return model.notices
    .map(
      (notice) => `
        <div class="notice ${notice.kind}">
          <div class="notice-icon">${escapeHtml(notice.icon)}</div>
          <div>${escapeHtml(notice.body)}</div>
        </div>
      `
    )
    .join("");
}

function renderWins(model) {
  if (!model.wins.length) return "";
  return `
    <div class="wins">
      <div class="wins-star">★</div>
      <div style="flex:1">
        <div class="wins-lbl">This period's wins</div>
        <div class="wins-list">
          ${model.wins
            .map(
              (win) => `
                <div class="win">
                  <div class="win-dot"></div>
                  <div>${escapeHtml(win.label)} <strong>${escapeHtml(win.value)}</strong>${win.context ? ` — ${escapeHtml(win.context)}` : ""}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderMetricCards(model) {
  if (!model.metricCards.length) return "";
  return `
    <div class="sec">Key numbers</div>
    <div class="m-grid">
      ${model.metricCards
        .map(
          (card) => `
            <div class="m-card${card.primary ? " primary" : ""}">
              <div class="m-lbl">${escapeHtml(card.label)}</div>
              <div class="m-val ${card.tone}">${escapeHtml(card.value)}</div>
              <div class="m-delta ${card.tone}">${escapeHtml(card.delta || "—")}</div>
              ${card.note ? `<div class="m-note">${escapeHtml(card.note)}</div>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMetricCardsPdf(model) {
  if (!model.metricCards.length) return "";
  return `
    <div class="sec">Key numbers</div>
    <table class="m-table" role="presentation">
      <tbody>
        <tr>
          ${model.metricCards
            .map(
              (card) => `
                <td class="m-cell">
                  <div class="m-card${card.primary ? " primary" : ""}">
                    <div class="m-lbl">${escapeHtml(card.label)}</div>
                    <div class="m-val ${card.tone}">${escapeHtml(card.value)}</div>
                    <div class="m-delta ${card.tone}">${escapeHtml(card.delta || "—")}</div>
                    ${card.note ? `<div class="m-note">${escapeHtml(card.note)}</div>` : ""}
                  </div>
                </td>
              `
            )
            .join("")}
        </tr>
      </tbody>
    </table>
  `;
}

function renderChannels(model) {
  if (!model.channels.length) return "";
  return `
    <div class="sec">Channel breakdown</div>
    <div class="ch-stack">
      ${model.channels
        .map(
          (channel) => `
            <div class="ch-card">
              <div class="ch-hdr ${channel.tone}">
                <div class="ch-left">
                  <div class="ch-bar ${channel.tone}"></div>
                  <div class="ch-name">${escapeHtml(channel.name)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                  <div class="ch-stats">
                    ${channel.stats
                      .map(
                        (stat) => `
                          <div class="ch-stat">
                            <div class="ch-stat-lbl">${escapeHtml(stat.label)}</div>
                            <div class="ch-stat-val ${channel.tone}">${escapeHtml(stat.value)}</div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                  <span class="pill ${channel.tone}">${escapeHtml(channel.pillLabel)}</span>
                </div>
              </div>
              ${channel.note ? `<div class="ch-note">${escapeHtml(channel.note)}</div>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderChannelsPdf(model) {
  if (!model.channels.length) return "";
  return `
    <div class="sec">Channel breakdown</div>
    <div class="ch-stack">
      ${model.channels
        .map(
          (channel) => `
            <div class="ch-card">
              <div class="ch-hdr ${channel.tone}">
                <table class="ch-head-table" role="presentation">
                  <tbody>
                    <tr>
                      <td class="ch-name-cell">
                        <div class="ch-left">
                          <div class="ch-bar ${channel.tone}"></div>
                          <div class="ch-name">${escapeHtml(channel.name)}</div>
                        </div>
                      </td>
                      <td class="ch-stats-cell">
                        <table class="ch-stats-table" role="presentation">
                          <tbody>
                            <tr>
                              ${channel.stats
                                .map(
                                  (stat) => `
                                    <td class="ch-stat-cell">
                                      <div class="ch-stat">
                                        <div class="ch-stat-lbl">${escapeHtml(stat.label)}</div>
                                        <div class="ch-stat-val ${channel.tone}">${escapeHtml(stat.value)}</div>
                                      </div>
                                    </td>
                                  `
                                )
                                .join("")}
                            </tr>
                          </tbody>
                        </table>
                      </td>
                      <td class="ch-pill-cell">
                        <span class="pill ${channel.tone}">${escapeHtml(channel.pillLabel)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              ${channel.note ? `<div class="ch-note">${escapeHtml(channel.note)}</div>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderGbp(model) {
  if (!model.gbp || !model.gbp.metrics.length) return "";
  return `
    <div class="sec">Google Business Profile</div>
    <div class="gbp-card">
      <div class="gbp-hdr">
        <span class="gbp-title">Activity from your Google listing</span>
        <span class="pill ${model.gbp.tone}">${escapeHtml(pillLabelFromTone(model.gbp.tone))}</span>
      </div>
      <div class="gbp-grid">
        ${model.gbp.metrics
          .map(
            (metric) => `
              <div class="gbp-m">
                <div class="gbp-m-lbl">${escapeHtml(metric.label)}</div>
                <div class="gbp-m-val ${metric.tone}">${escapeHtml(metric.value)}</div>
                <div class="gbp-m-delta ${metric.tone}">${escapeHtml(metric.delta || "—")}</div>
              </div>
            `
          )
          .join("")}
      </div>
      ${model.gbp.reviewsLine ? `<div class="gbp-reviews">★ <span>${escapeHtml(model.gbp.reviewsLine)}</span></div>` : ""}
    </div>
  `;
}

function renderGbpPdf(model) {
  if (!model.gbp || !model.gbp.metrics.length) return "";
  return `
    <div class="sec">Google Business Profile</div>
    <div class="gbp-card">
      <div class="gbp-hdr">
        <span class="gbp-title">Activity from your Google listing</span>
        <span class="pill ${model.gbp.tone}">${escapeHtml(pillLabelFromTone(model.gbp.tone))}</span>
      </div>
      <table class="gbp-table" role="presentation">
        <tbody>
          <tr>
            ${model.gbp.metrics
              .map(
                (metric) => `
                  <td class="gbp-cell">
                    <div class="gbp-m">
                      <div class="gbp-m-lbl">${escapeHtml(metric.label)}</div>
                      <div class="gbp-m-val ${metric.tone}">${escapeHtml(metric.value)}</div>
                      <div class="gbp-m-delta ${metric.tone}">${escapeHtml(metric.delta || "—")}</div>
                    </div>
                  </td>
                `
              )
              .join("")}
          </tr>
        </tbody>
      </table>
      ${model.gbp.reviewsLine ? `<div class="gbp-reviews">★ <span>${escapeHtml(model.gbp.reviewsLine)}</span></div>` : ""}
    </div>
  `;
}

function renderReviewInsights(model) {
  if (!model.reviewInsights) return "";
  return `
    <div class="sec">What your customers are saying</div>
    <div class="rv-card">
      <div class="rv-hdr">
        <span class="rv-title">Customer feedback themes</span>
        ${model.reviewInsights.summary ? `<span class="rv-meta">${escapeHtml(model.reviewInsights.summary)}</span>` : ""}
      </div>
      <div class="rv-cols">
        <div class="rv-col">
          <div class="rv-col-lbl pos">What they love</div>
          ${model.reviewInsights.positives
            .map(
              (theme) => `
                <div class="rv-theme">
                  <div class="rv-theme-title">${escapeHtml(theme.title)}</div>
                  <div class="rv-theme-body">${escapeHtml(theme.body)}</div>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="rv-col watch">
          <div class="rv-col-lbl watch">Worth your attention</div>
          ${model.reviewInsights.watchAreas
            .map(
              (theme) => `
                <div class="rv-theme">
                  <div class="rv-theme-title">${escapeHtml(theme.title)}</div>
                  <div class="rv-theme-body">${escapeHtml(theme.body)}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderBusinessIntelligence(model) {
  if (!model.businessIntelligence.length) return "";
  return `
    <div class="bi-wrap">
      <div class="bi-hdr">
        <div>
          <div class="bi-hdr-title">What your search data tells us</div>
          <div class="bi-hdr-sub">Patterns in what your customers are searching for</div>
        </div>
        <div class="bi-badge">Search insight</div>
      </div>
      <div class="bi-cards">
        ${model.businessIntelligence
          .map(
            (insight) => `
              <div class="bi-card">
                <div class="bi-card-title">
                  <span class="bi-tag">${escapeHtml(insight.tag)}</span>
                  ${escapeHtml(insight.title)}
                </div>
                <div class="bi-card-body">${escapeHtml(insight.body)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderOrganicPages(model) {
  if (!model.organicPages || !model.organicPages.rows.length) return "";
  return `
    <div class="sec">Organic search — page detail</div>
    <div class="pages-card">
      <div class="pg-hdr">
        <span class="pg-hdr-title">Top organic pages</span>
        ${model.organicPages.note ? `<span class="pg-hdr-note">${escapeHtml(model.organicPages.note)}</span>` : ""}
      </div>
      ${model.organicPages.rows
        .map(
          (row) => `
            <div class="pg-row">
              <div class="pg-left">
                <div class="pg-url">${escapeHtml(row.url)}</div>
                ${row.note ? `<div class="pg-note">${escapeHtml(row.note)}</div>` : ""}
              </div>
              <div class="pg-metrics">
                ${row.metrics
                  .map(
                    (metric) => `
                      <div class="pm">
                        <div class="pm-lbl">${escapeHtml(metric.label)}</div>
                        <div class="pm-val ${metric.tone}">${escapeHtml(metric.value)}</div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOrganicPagesPdf(model) {
  if (!model.organicPages || !model.organicPages.rows.length) return "";
  return `
    <div class="sec">Organic search — page detail</div>
    <div class="pages-card">
      <div class="pg-hdr">
        <span class="pg-hdr-title">Top organic pages</span>
        ${model.organicPages.note ? `<span class="pg-hdr-note">${escapeHtml(model.organicPages.note)}</span>` : ""}
      </div>
      ${model.organicPages.rows
        .map(
          (row) => `
            <table class="pg-row-table" role="presentation">
              <tbody>
                <tr>
                  <td class="pg-left-cell">
                    <div class="pg-left">
                      <div class="pg-url">${escapeHtml(row.url)}</div>
                      ${row.note ? `<div class="pg-note">${escapeHtml(row.note)}</div>` : ""}
                    </div>
                  </td>
                  <td class="pg-metrics-cell">
                    <table class="pg-metrics-table" role="presentation">
                      <tbody>
                        <tr>
                          ${row.metrics
                            .map(
                              (metric) => `
                                <td class="pm-cell">
                                  <div class="pm">
                                    <div class="pm-lbl">${escapeHtml(metric.label)}</div>
                                    <div class="pm-val ${metric.tone}">${escapeHtml(metric.value)}</div>
                                  </div>
                                </td>
                              `
                            )
                            .join("")}
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRankings(model) {
  if (!model.rankings) return "";
  return `
    <div class="sec">Search rankings</div>
    <div class="rk-card">
      <div class="rk-hdr">
        <div class="rk-title">Ranking movements</div>
        ${model.rankings.subtitle ? `<div class="rk-sub">${escapeHtml(model.rankings.subtitle)}</div>` : ""}
      </div>
      ${model.rankings.summary ? `<div class="rk-summary">${escapeHtml(model.rankings.summary)}</div>` : ""}
      ${model.rankings.biggestMovers.length
        ? `
          <div class="list-hdr">Biggest ranking jumps this period</div>
          ${model.rankings.biggestMovers
            .map(
              (row) => `
                <div class="list-row">
                  <div class="list-q">${escapeHtml(row.query)}</div>
                  <div class="list-v ${row.tone}">${escapeHtml(row.value)}</div>
                </div>
              `
            )
            .join("")}
        `
        : ""}
      ${model.rankings.newRankings.length
        ? `
          <div class="list-hdr top-border">New searches you are now showing up for</div>
          ${model.rankings.newRankings
            .map(
              (row) => `
                <div class="list-row">
                  <div class="list-q">${escapeHtml(row.query)}</div>
                  <div class="list-v ${row.tone}">${escapeHtml(row.value)}</div>
                </div>
              `
            )
            .join("")}
        `
        : ""}
    </div>
  `;
}

function renderRankingsPdf(model) {
  if (!model.rankings) return "";
  return `
    <div class="sec">Search rankings</div>
    <div class="rk-card">
      <div class="rk-hdr">
        <div class="rk-title">Ranking movements</div>
        ${model.rankings.subtitle ? `<div class="rk-sub">${escapeHtml(model.rankings.subtitle)}</div>` : ""}
      </div>
      ${model.rankings.summary ? `<div class="rk-summary">${escapeHtml(model.rankings.summary)}</div>` : ""}
      ${model.rankings.biggestMovers.length
        ? `
          <div class="list-hdr">Biggest ranking jumps this period</div>
          ${model.rankings.biggestMovers
            .map(
              (row) => `
                <table class="list-row-table" role="presentation">
                  <tbody>
                    <tr>
                      <td class="list-q-cell"><div class="list-q">${escapeHtml(row.query)}</div></td>
                      <td class="list-v-cell"><div class="list-v ${row.tone}">${escapeHtml(row.value)}</div></td>
                    </tr>
                  </tbody>
                </table>
              `
            )
            .join("")}
        `
        : ""}
      ${model.rankings.newRankings.length
        ? `
          <div class="list-hdr top-border">New searches you are now showing up for</div>
          ${model.rankings.newRankings
            .map(
              (row) => `
                <table class="list-row-table" role="presentation">
                  <tbody>
                    <tr>
                      <td class="list-q-cell"><div class="list-q">${escapeHtml(row.query)}</div></td>
                      <td class="list-v-cell"><div class="list-v ${row.tone}">${escapeHtml(row.value)}</div></td>
                    </tr>
                  </tbody>
                </table>
              `
            )
            .join("")}
        `
        : ""}
    </div>
  `;
}

function renderReviewAreas(model) {
  if (!model.reviewAreas.length) return "";
  return `
    <div class="wr-block">
      <div class="wr-lbl">What we're reviewing</div>
      <div class="wr-items">
        ${model.reviewAreas
          .map(
            (area, index) => `
              <div class="wr-item">
                <div class="wr-num">${index + 1}</div>
                <div class="wr-text"><strong>${escapeHtml(area.title)}.</strong> ${escapeHtml(area.body)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderConfidenceNote(model) {
  if (!model.confidenceNote) return "";
  return `
    <div class="wr-block confidence-block">
      <div class="wr-lbl">Confidence note</div>
      <div class="cf-body">${escapeHtml(model.confidenceNote)}</div>
    </div>
  `;
}

function renderHeader(model) {
  return `
    <header class="hdr">
      <div>
        <div class="hdr-agency">SEO Performance Report · ${escapeHtml(model.header.agencyName)}</div>
        <div class="hdr-client">${escapeHtml(model.header.businessName)}</div>
      </div>
      <div class="hdr-meta">
        ${model.header.periodLine ? `<div class="hdr-period">${escapeHtml(model.header.periodLine)}</div>` : ""}
        <div class="hdr-tag">${escapeHtml(model.header.reportTag)}</div>
      </div>
    </header>
  `;
}

function renderHeaderPdf(model) {
  return `
    <header class="hdr hdr-pdf">
      <table class="hdr-table" role="presentation">
        <tbody>
          <tr>
            <td class="hdr-left-cell">
              <div class="hdr-agency">SEO Performance Report · ${escapeHtml(model.header.agencyName)}</div>
              <div class="hdr-client">${escapeHtml(model.header.businessName)}</div>
            </td>
            <td class="hdr-right-cell">
              ${model.header.periodLine ? `<div class="hdr-period">${escapeHtml(model.header.periodLine)}</div>` : ""}
              <div class="hdr-tag">${escapeHtml(model.header.reportTag)}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </header>
  `;
}

function buildPerformanceReportV2BodyHtml(input, context = {}) {
  const model = mapPerformanceReportV2Template(input, context);
  if (!model) {
    return '<div class="pr-v2-root"><div class="report"><div class="headline"><div class="hl-title">Performance Report</div><div class="hl-body"><p>Report data is unavailable.</p></div></div></div></div>';
  }

  return `
    <div class="pr-v2-root">
      <div class="report">
        ${renderHeader(model)}

        ${renderNotices(model)}
        ${model.headline ? `<div class="headline"><div class="hl-title">${escapeHtml(model.headline.title)}</div><div class="hl-body">${renderHtmlParagraphs(model.headline.body)}</div></div>` : ""}
        ${renderWins(model)}
        ${renderMetricCards(model)}
        ${renderChannels(model)}
        ${renderGbp(model)}
        ${renderReviewInsights(model)}
        ${renderBusinessIntelligence(model)}
        ${renderOrganicPages(model)}
        ${renderRankings(model)}
        ${renderReviewAreas(model)}
        ${renderConfidenceNote(model)}
        ${model.footer ? `<footer class="rpt-footer">${escapeHtml(model.footer)}</footer>` : ""}
      </div>
    </div>
  `;
}

function buildPerformanceReportV2PdfBodyHtml(input, context = {}) {
  const model = mapPerformanceReportV2Template(input, context);
  if (!model) {
    return '<div class="pr-v2-root"><div class="report"><div class="headline"><div class="hl-title">Performance Report</div><div class="hl-body"><p>Report data is unavailable.</p></div></div></div></div>';
  }

  return `
    <div class="pr-v2-root pr-v2-pdf">
      <div class="report">
        ${renderHeaderPdf(model)}

        ${renderNotices(model)}
        ${model.headline ? `<div class="headline"><div class="hl-title">${escapeHtml(model.headline.title)}</div><div class="hl-body">${renderHtmlParagraphs(model.headline.body)}</div></div>` : ""}
        ${renderWins(model)}
        ${renderMetricCardsPdf(model)}
        ${renderChannelsPdf(model)}
        ${renderGbpPdf(model)}
        ${renderReviewInsights(model)}
        ${renderBusinessIntelligence(model)}
        ${renderOrganicPagesPdf(model)}
        ${renderRankingsPdf(model)}
        ${renderReviewAreas(model)}
        ${renderConfidenceNote(model)}
        ${model.footer ? `<footer class="rpt-footer">${escapeHtml(model.footer)}</footer>` : ""}
      </div>
    </div>
  `;
}

const PERFORMANCE_REPORT_V2_BASE_CSS = `
  .pr-v2-root, .pr-v2-root *, .pr-v2-root *::before, .pr-v2-root *::after{box-sizing:border-box;margin:0;padding:0}
  .pr-v2-root{
    --report-bg:#FFFFFF;
    --report-card:#FFFFFF;
    --report-subtle:#FAFAFA;
    --report-muted-surface:#F5F5F5;
    --report-border:#E5E5E5;
    --report-border-strong:#D4D4D4;
    --report-text:#0A0A0A;
    --report-text-soft:#404040;
    --report-muted:#737373;
    --report-accent:#2E6A56;
    --report-accent-soft:#EEF6F3;
    --report-accent-border:#CFE7DE;
    --report-positive:#16A34A;
    --report-positive-soft:#F0FDF4;
    --report-negative:#DC2626;
    --report-negative-soft:#FEF2F2;
    --report-warning:#B45309;
    --report-warning-soft:#FFFBEB;
    --report-info:#1D4ED8;
    --report-info-soft:#EFF6FF;
    --font-sans:var(--font-geist-sans, "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    --font-mono:var(--font-geist-mono, "Geist Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
    --rule:1px solid var(--report-border);
    font-family:var(--font-sans);
    background:var(--report-bg);
    color:var(--report-text);
    padding:32px 20px 56px;
    font-size:14px;
    line-height:1.55;
    -webkit-font-smoothing:antialiased
  }
  .pr-v2-root .report{max-width:760px;margin:0 auto}
  .pr-v2-root .hdr{
    display:flex;justify-content:space-between;align-items:flex-end;gap:24px;
    padding-bottom:18px;margin-bottom:24px;border-bottom:1px solid var(--report-border)
  }
  .pr-v2-root .hdr-table{width:100%;table-layout:fixed;border-collapse:collapse}
  .pr-v2-root .hdr-left-cell{vertical-align:bottom}
  .pr-v2-root .hdr-right-cell{width:280px;vertical-align:bottom;text-align:right}
  .pr-v2-root .hdr-agency{
    font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.02em;
    color:var(--report-muted);margin-bottom:6px
  }
  .pr-v2-root .hdr-client{
    font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1.05;color:var(--report-text)
  }
  .pr-v2-root .hdr-meta{text-align:right}
  .pr-v2-root .hdr-period{font-size:12px;color:var(--report-muted);margin-bottom:6px}
  .pr-v2-root .hdr-tag{
    display:inline-flex;align-items:center;border:1px solid var(--report-border);
    background:var(--report-subtle);border-radius:999px;padding:4px 10px;
    font-size:11px;font-weight:600;color:var(--report-text-soft)
  }
  .pr-v2-root .notice{
    display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
    border-radius:10px;margin-bottom:10px;font-size:12px;line-height:1.6
  }
  .pr-v2-root .notice.context{
    background:var(--report-warning-soft);border:1px solid #F5D48F;color:#854F0B
  }
  .pr-v2-root .notice.baseline{
    background:var(--report-info-soft);border:1px solid #BFDBFE;color:#1E3A8A
  }
  .pr-v2-root .notice strong{font-weight:600;color:inherit}
  .pr-v2-root .notice-icon{flex-shrink:0;margin-top:1px}
  .pr-v2-root .headline,
  .pr-v2-root .wins,
  .pr-v2-root .gbp-card,
  .pr-v2-root .rv-card,
  .pr-v2-root .pages-card,
  .pr-v2-root .rk-card,
  .pr-v2-root .wr-block{
    background:var(--report-card);
    border:var(--rule);
    border-radius:12px;
    box-shadow:0 1px 2px rgba(0,0,0,.04)
  }
  .pr-v2-root .headline{padding:24px 24px 22px;margin:16px 0 18px}
  .pr-v2-root .hl-title{
    font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.25;
    margin-bottom:10px;color:var(--report-text)
  }
  .pr-v2-root .hl-body{font-size:13px;color:var(--report-text-soft);line-height:1.72}
  .pr-v2-root .hl-body strong{color:var(--report-text);font-weight:600}
  .pr-v2-root .hl-body p + p{margin-top:10px}
  .pr-v2-root .wins{
    padding:18px 20px;margin-bottom:24px;display:flex;gap:14px;align-items:flex-start;
    background:linear-gradient(180deg, #FFFFFF 0%, #FBFDFB 100%)
  }
  .pr-v2-root .wins-star{
    width:34px;height:34px;border-radius:10px;background:var(--report-accent-soft);
    border:1px solid var(--report-accent-border);display:flex;align-items:center;justify-content:center;
    font-size:14px;flex-shrink:0;margin-top:1px;color:var(--report-accent)
  }
  .pr-v2-root .wins-lbl{
    font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    color:var(--report-muted);margin-bottom:10px
  }
  .pr-v2-root .wins-list{display:flex;flex-direction:column;gap:8px}
  .pr-v2-root .win{
    display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--report-text-soft);
    line-height:1.55
  }
  .pr-v2-root .win-dot{
    width:5px;height:5px;border-radius:999px;background:var(--report-accent);
    flex-shrink:0;margin-top:7px
  }
  .pr-v2-root .win strong{font-weight:600;color:var(--report-text)}
  .pr-v2-root .sec{
    font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.04em;
    text-transform:uppercase;color:var(--report-muted);margin-bottom:10px
  }
  .pr-v2-root .m-grid{display:flex;gap:10px;margin-bottom:24px;align-items:stretch}
  .pr-v2-root .m-card{
    background:var(--report-card);border-radius:12px;padding:16px;border:var(--rule);
    box-shadow:0 1px 2px rgba(0,0,0,.04);flex:1 1 0;min-width:0
  }
  .pr-v2-root .m-table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:10px 0;margin:0 0 24px}
  .pr-v2-root .m-cell{width:25%;vertical-align:top}
  .pr-v2-root .m-card.primary{border-color:var(--report-accent-border);background:#FCFDFC}
  .pr-v2-root .m-lbl{
    font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;
    color:var(--report-muted);margin-bottom:8px
  }
  .pr-v2-root .m-val{
    font-size:29px;font-weight:700;line-height:1.02;letter-spacing:-.03em;margin-bottom:6px
  }
  .pr-v2-root .m-val.strong{color:var(--report-text)}
  .pr-v2-root .m-val.dip{color:var(--report-text)}
  .pr-v2-root .m-val.neu{color:var(--report-text)}
  .pr-v2-root .m-delta{font-size:12px;font-weight:600;line-height:1.2}
  .pr-v2-root .m-delta.strong{color:var(--report-positive)}
  .pr-v2-root .m-delta.dip{color:var(--report-negative)}
  .pr-v2-root .m-delta.neu{color:var(--report-muted)}
  .pr-v2-root .m-note{font-size:11px;color:var(--report-muted);margin-top:6px}
  .pr-v2-root .pill{
    display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;
    border:1px solid transparent;font-size:11px;font-weight:600;line-height:1
  }
  .pr-v2-root .pill::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .pr-v2-root .pill.strong{background:var(--report-positive-soft);border-color:#BBF7D0;color:var(--report-positive)}
  .pr-v2-root .pill.strong::before{background:var(--report-positive)}
  .pr-v2-root .pill.dip{background:var(--report-negative-soft);border-color:#FECACA;color:var(--report-negative)}
  .pr-v2-root .pill.dip::before{background:var(--report-negative)}
  .pr-v2-root .pill.neu{background:var(--report-subtle);border-color:var(--report-border);color:var(--report-muted)}
  .pr-v2-root .pill.neu::before{background:var(--report-muted)}
  .pr-v2-root .ch-stack{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
  .pr-v2-root .ch-card{background:var(--report-card);border-radius:12px;border:var(--rule);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .pr-v2-root .ch-hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:var(--rule);gap:16px}
  .pr-v2-root .ch-hdr.strong{background:#FBFDFB}
  .pr-v2-root .ch-hdr.dip{background:#FFFBFB}
  .pr-v2-root .ch-hdr.neu{background:var(--report-subtle)}
  .pr-v2-root .ch-left{display:flex;align-items:center;gap:10px}
  .pr-v2-root .ch-bar{width:3px;height:20px;border-radius:999px;flex-shrink:0}
  .pr-v2-root .ch-bar.strong{background:var(--report-positive)}
  .pr-v2-root .ch-bar.dip{background:var(--report-negative)}
  .pr-v2-root .ch-bar.neu{background:var(--report-border-strong)}
  .pr-v2-root .ch-name{font-size:14px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .ch-stats{display:flex;gap:18px}
  .pr-v2-root .ch-stat{text-align:right}
  .pr-v2-root .ch-head-table{width:100%;table-layout:auto;border-collapse:collapse}
  .pr-v2-root .ch-name-cell{width:100%;vertical-align:middle}
  .pr-v2-root .ch-stats-cell{vertical-align:middle;white-space:nowrap;text-align:right}
  .pr-v2-root .ch-pill-cell{vertical-align:middle;text-align:right;white-space:nowrap;padding-left:16px}
  .pr-v2-root .ch-stats-table{border-collapse:collapse}
  .pr-v2-root .ch-stat-cell{vertical-align:top;text-align:right;padding-left:18px}
  .pr-v2-root .ch-stat-cell:first-child{padding-left:0}
  .pr-v2-root .ch-stat-lbl{
    font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--report-muted);
    margin-bottom:3px
  }
  .pr-v2-root .ch-stat-val{font-size:15px;font-weight:600}
  .pr-v2-root .ch-stat-val.strong{color:var(--report-positive)}
  .pr-v2-root .ch-stat-val.dip{color:var(--report-negative)}
  .pr-v2-root .ch-stat-val.neu{color:var(--report-muted)}
  .pr-v2-root .ch-note{padding:12px 18px 14px;font-size:12px;color:var(--report-text-soft);line-height:1.65}
  .pr-v2-root .gbp-card{overflow:hidden;margin-bottom:24px}
  .pr-v2-root .gbp-hdr{
    padding:14px 20px;border-bottom:var(--rule);display:flex;justify-content:space-between;
    align-items:center;gap:12px;background:var(--report-subtle)
  }
  .pr-v2-root .gbp-title{font-size:14px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .gbp-grid{display:flex;align-items:stretch}
  .pr-v2-root .gbp-table{width:100%;table-layout:fixed;border-collapse:collapse}
  .pr-v2-root .gbp-cell{width:25%;vertical-align:top;border-right:var(--rule)}
  .pr-v2-root .gbp-cell:last-child{border-right:none}
  .pr-v2-root .gbp-m{padding:15px 18px;border-right:var(--rule);flex:1 1 0;min-width:0}
  .pr-v2-root .gbp-m:last-child{border-right:none}
  .pr-v2-root .gbp-m-lbl{
    font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;
    color:var(--report-muted);margin-bottom:7px
  }
  .pr-v2-root .gbp-m-val{
    font-size:28px;font-weight:700;letter-spacing:-.03em;line-height:1.02;
    margin-bottom:5px;color:var(--report-text)
  }
  .pr-v2-root .gbp-m-delta{font-size:12px;font-weight:600;line-height:1.2}
  .pr-v2-root .gbp-m-delta.strong{color:var(--report-positive)}
  .pr-v2-root .gbp-m-delta.dip{color:var(--report-negative)}
  .pr-v2-root .gbp-m-delta.neu{color:var(--report-muted)}
  .pr-v2-root .gbp-reviews{
    padding:11px 20px;border-top:var(--rule);background:var(--report-subtle);
    font-size:12px;color:var(--report-muted);display:flex;align-items:center;gap:8px
  }
  .pr-v2-root .gbp-reviews strong{color:var(--report-text);font-weight:600}
  .pr-v2-root .rv-card{overflow:hidden;margin-bottom:24px}
  .pr-v2-root .rv-hdr{
    padding:14px 20px;background:var(--report-subtle);border-bottom:var(--rule);
    display:flex;justify-content:space-between;align-items:center;gap:12px
  }
  .pr-v2-root .rv-title{font-size:14px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .rv-meta{font-size:11px;color:var(--report-muted)}
  .pr-v2-root .rv-cols{display:grid;grid-template-columns:1fr 1fr}
  .pr-v2-root .rv-col{padding:16px 20px;background:var(--report-card)}
  .pr-v2-root .rv-col.watch{background:#FCFCFC;border-left:var(--rule)}
  .pr-v2-root .rv-col-lbl{
    font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    margin-bottom:12px
  }
  .pr-v2-root .rv-col-lbl.pos{color:var(--report-positive)}
  .pr-v2-root .rv-col-lbl.watch{color:var(--report-muted)}
  .pr-v2-root .rv-theme{margin-bottom:13px}
  .pr-v2-root .rv-theme:last-child{margin-bottom:0}
  .pr-v2-root .rv-theme-title{font-size:12px;font-weight:600;color:var(--report-text);margin-bottom:3px}
  .pr-v2-root .rv-theme-body{font-size:12px;color:var(--report-text-soft);line-height:1.65}
  .pr-v2-root .bi-wrap{margin-bottom:24px}
  .pr-v2-root .bi-hdr{
    background:var(--report-card);border:var(--rule);border-radius:12px 12px 0 0;
    border-bottom:none;padding:16px 20px;display:flex;justify-content:space-between;
    align-items:flex-start;gap:16px
  }
  .pr-v2-root .bi-hdr-title{font-size:15px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .bi-hdr-sub{font-size:11px;color:var(--report-muted);margin-top:4px}
  .pr-v2-root .bi-badge{
    font-size:10px;font-weight:600;letter-spacing:.04em;padding:4px 10px;border-radius:999px;
    background:var(--report-accent-soft);border:1px solid var(--report-accent-border);
    color:var(--report-accent);flex-shrink:0
  }
  .pr-v2-root .bi-cards{
    border:var(--rule);border-top:none;border-radius:0 0 12px 12px;overflow:hidden;
    box-shadow:0 1px 2px rgba(0,0,0,.04)
  }
  .pr-v2-root .bi-card{padding:16px 20px;background:var(--report-card);border-bottom:var(--rule)}
  .pr-v2-root .bi-card:last-child{border-bottom:none}
  .pr-v2-root .bi-card-title{
    font-size:13px;font-weight:600;color:var(--report-text);margin-bottom:6px;
    display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.4
  }
  .pr-v2-root .bi-tag{
    font-size:10px;padding:2px 8px;border-radius:999px;font-weight:500;white-space:nowrap;
    background:var(--report-subtle);border:1px solid var(--report-border);color:var(--report-muted)
  }
  .pr-v2-root .bi-card-body{font-size:13px;color:var(--report-text-soft);line-height:1.68}
  .pr-v2-root .pages-card{overflow:hidden;margin-bottom:24px}
  .pr-v2-root .pg-hdr{
    padding:14px 20px;border-bottom:var(--rule);background:var(--report-subtle);
    display:flex;justify-content:space-between;align-items:center;gap:12px
  }
  .pr-v2-root .pg-hdr-title{font-size:14px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .pg-hdr-note{font-size:11px;color:var(--report-muted)}
  .pr-v2-root .pg-row{
    display:flex;justify-content:space-between;align-items:flex-start;
    padding:12px 20px;border-bottom:var(--rule);gap:12px
  }
  .pr-v2-root .pg-row:last-child{border-bottom:none}
  .pr-v2-root .pg-left{flex:1;min-width:0}
  .pr-v2-root .pg-url{
    font-size:11px;font-family:var(--font-mono);color:var(--report-text);font-weight:500
  }
  .pr-v2-root .pg-note{font-size:11px;color:var(--report-muted);margin-top:4px;line-height:1.55}
  .pr-v2-root .pg-metrics{display:flex;gap:16px;flex-shrink:0}
  .pr-v2-root .pg-row-table{width:100%;table-layout:fixed;border-collapse:collapse;border-bottom:var(--rule)}
  .pr-v2-root .pg-row-table:last-child{border-bottom:none}
  .pr-v2-root .pg-left-cell{vertical-align:top;padding:12px 20px}
  .pr-v2-root .pg-metrics-cell{width:220px;vertical-align:top;padding:12px 20px 12px 0}
  .pr-v2-root .pg-metrics-table{width:100%;table-layout:fixed;border-collapse:collapse}
  .pr-v2-root .pm-cell{vertical-align:top;text-align:right;padding-left:16px}
  .pr-v2-root .pm-cell:first-child{padding-left:0}
  .pr-v2-root .pm{text-align:right}
  .pr-v2-root .pm-lbl{
    font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--report-muted)
  }
  .pr-v2-root .pm-val{font-size:13px;font-weight:600}
  .pr-v2-root .pm-val.strong{color:var(--report-positive)}
  .pr-v2-root .pm-val.dip{color:var(--report-negative)}
  .pr-v2-root .pm-val.neu{color:var(--report-muted)}
  .pr-v2-root .rk-card{overflow:hidden;margin-bottom:24px}
  .pr-v2-root .rk-hdr{padding:14px 20px;border-bottom:var(--rule);background:var(--report-subtle)}
  .pr-v2-root .rk-title{font-size:14px;font-weight:600;color:var(--report-text)}
  .pr-v2-root .rk-sub{font-size:12px;color:var(--report-text-soft);margin-top:4px;line-height:1.6}
  .pr-v2-root .rk-summary{
    padding:12px 20px;border-bottom:var(--rule);font-size:13px;color:var(--report-text-soft);line-height:1.65
  }
  .pr-v2-root .rk-summary strong{font-weight:600;color:var(--report-text)}
  .pr-v2-root .list-hdr{
    padding:9px 20px 7px;font-size:9px;font-weight:600;letter-spacing:.08em;
    text-transform:uppercase;color:var(--report-muted);border-bottom:var(--rule);font-family:var(--font-mono)
  }
  .pr-v2-root .list-hdr.top-border{border-top:var(--rule)}
  .pr-v2-root .list-row{
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 20px;border-bottom:var(--rule);gap:12px
  }
  .pr-v2-root .list-row:last-child{border-bottom:none}
  .pr-v2-root .list-row-table{width:100%;table-layout:fixed;border-collapse:collapse;border-bottom:var(--rule)}
  .pr-v2-root .list-row-table:last-child{border-bottom:none}
  .pr-v2-root .list-q-cell{vertical-align:middle;padding:10px 20px}
  .pr-v2-root .list-v-cell{width:220px;vertical-align:middle;padding:10px 20px 10px 0;text-align:right}
  .pr-v2-root .list-q{font-size:13px;color:var(--report-text)}
  .pr-v2-root .list-v{font-size:12px;font-weight:600}
  .pr-v2-root .list-v.strong{color:var(--report-positive)}
  .pr-v2-root .list-v.dip{color:var(--report-negative)}
  .pr-v2-root .list-v.neu{color:var(--report-muted)}
  .pr-v2-root .wr-block{padding:20px 22px;margin-bottom:24px}
  .pr-v2-root .wr-lbl{
    font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.04em;
    text-transform:uppercase;color:var(--report-muted);margin-bottom:14px
  }
  .pr-v2-root .wr-items{display:flex;flex-direction:column;gap:14px}
  .pr-v2-root .wr-item{display:flex;gap:12px}
  .pr-v2-root .wr-num{
    font-size:18px;font-weight:700;color:var(--report-accent);line-height:1;flex-shrink:0;width:20px;padding-top:2px
  }
  .pr-v2-root .wr-text{
    font-size:13px;color:var(--report-text-soft);line-height:1.65;font-weight:400;padding-top:1px
  }
  .pr-v2-root .wr-text strong{color:var(--report-text);font-weight:600}
  .pr-v2-root .cf-body{
    font-size:13px;color:var(--report-text-soft);line-height:1.65
  }
  .pr-v2-root .rpt-footer{
    text-align:center;padding-top:24px;border-top:1px solid var(--report-border);
    font-size:11px;color:var(--report-muted);font-family:var(--font-mono)
  }
  @media (max-width: 860px) {
    .pr-v2-root .m-grid,
    .pr-v2-root .gbp-grid { flex-direction:column; }
    .pr-v2-root .rv-cols { grid-template-columns:1fr; }
    .pr-v2-root .hdr,
    .pr-v2-root .ch-hdr,
    .pr-v2-root .pg-row,
    .pr-v2-root .list-row { flex-direction:column; align-items:flex-start; }
    .pr-v2-root .hdr-meta,
    .pr-v2-root .ch-stat,
    .pr-v2-root .pm { text-align:left; }
    .pr-v2-root .ch-stats,
    .pr-v2-root .pg-metrics { flex-wrap:wrap; }
    .pr-v2-root .rv-col.watch { border-left:none; border-top:var(--rule); }
    .pr-v2-root .gbp-m { border-right:none; border-bottom:var(--rule); }
    .pr-v2-root .gbp-m:last-child { border-bottom:none; }
  }
  @media print {
    .pr-v2-root { padding:28px 16px 36px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .pr-v2-root .hdr-pdf { display:block !important; }
    .pr-v2-root .hdr-table { width:100% !important; table-layout:fixed !important; }
    .pr-v2-root .hdr-left-cell { vertical-align:bottom !important; }
    .pr-v2-root .hdr-right-cell {
      width:280px !important;
      vertical-align:bottom !important;
      text-align:right !important;
      white-space:normal !important;
    }
    .pr-v2-root .m-grid { display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important; }
    .pr-v2-root .gbp-grid { display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important; }
    .pr-v2-root .ch-hdr {
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      justify-content:space-between !important;
      align-items:center !important;
    }
    .pr-v2-root .ch-left {
      flex:1 1 auto !important;
      min-width:0 !important;
    }
    .pr-v2-root .ch-hdr > div:last-child {
      display:flex !important;
      align-items:center !important;
      gap:16px !important;
      flex:0 0 auto !important;
      margin-left:auto !important;
      white-space:nowrap !important;
    }
    .pr-v2-root .ch-stats {
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      gap:18px !important;
    }
    .pr-v2-root .m-table,
    .pr-v2-root .gbp-table { width:100% !important; table-layout:fixed !important; }
    .pr-v2-root .m-cell,
    .pr-v2-root .gbp-cell { width:25% !important; }
    .pr-v2-root .rv-cols { grid-template-columns:1fr 1fr !important; }
    .pr-v2-root .pg-row {
      display:flex !important;
      flex-direction:row !important;
      justify-content:space-between !important;
      align-items:flex-start !important;
    }
    .pr-v2-root .pg-left {
      flex:1 1 auto !important;
      min-width:0 !important;
    }
    .pr-v2-root .pg-metrics {
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      justify-content:flex-end !important;
      flex-shrink:0 !important;
    }
    .pr-v2-root .pm {
      text-align:right !important;
    }
    .pr-v2-root .list-row {
      display:flex !important;
      flex-direction:row !important;
      justify-content:space-between !important;
      align-items:center !important;
    }
    .pr-v2-root .list-q {
      flex:1 1 auto !important;
      min-width:0 !important;
    }
    .pr-v2-root .list-v {
      flex:0 0 auto !important;
      text-align:right !important;
      margin-left:16px !important;
      white-space:nowrap !important;
    }
    .pr-v2-root .m-card,
    .pr-v2-root .ch-card,
    .pr-v2-root .gbp-card,
    .pr-v2-root .rv-card,
    .pr-v2-root .pages-card,
    .pr-v2-root .rk-card,
    .pr-v2-root .wins,
    .pr-v2-root .headline,
    .pr-v2-root .wr-block,
    .pr-v2-root .bi-wrap,
    .pr-v2-root .bi-card,
    .pr-v2-root .pg-row,
    .pr-v2-root .list-row,
    .pr-v2-root .gbp-m {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

const PERFORMANCE_REPORT_V2_SCOPED_CSS = PERFORMANCE_REPORT_V2_BASE_CSS;
const PERFORMANCE_REPORT_V2_CSS = `body{margin:0;padding:0;background:#FFFFFF;} @page{margin:10mm;} ${PERFORMANCE_REPORT_V2_BASE_CSS}`;

function createPerformanceReportV2HtmlDocument(bodyHtml, title = "Performance Report") {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>${PERFORMANCE_REPORT_V2_CSS}</style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `;
}

function buildPerformanceReportV2Document(input, context = {}, title = "Performance Report") {
  const html = buildPerformanceReportV2PdfBodyHtml(input, context);
  return {
    html,
    css: PERFORMANCE_REPORT_V2_CSS,
    scopedCss: PERFORMANCE_REPORT_V2_SCOPED_CSS,
    fullHtml: createPerformanceReportV2HtmlDocument(html, title),
  };
}

module.exports = {
  mapPerformanceReportV2Template,
  buildPerformanceReportV2BodyHtml,
  buildPerformanceReportV2PdfBodyHtml,
  createPerformanceReportV2HtmlDocument,
  buildPerformanceReportV2Document,
  PERFORMANCE_REPORT_V2_SCOPED_CSS,
  PERFORMANCE_REPORT_V2_CSS,
};

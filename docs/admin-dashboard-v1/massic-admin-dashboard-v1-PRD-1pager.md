# Massic Admin Dashboard v1 — Logic PRD (1-Pager)

Implementation-agnostic. Describes **what we compute and why**, not how it's built. Internal tool. Aggregates across the whole Massic network to answer: how are customers doing, how is the platform doing, how is the business doing, where to focus.

## 1\. Purpose

Turn the data we already collect per business (search performance, product usage, status, billing, API cost) into a network-wide view with the same numbers rolled down to any single agency. Every insight is **deterministic**: the same inputs always produce the same output. No ML, no causal claims in v1.

## 2\. What goes in

Everything is built from one conceptual **fact record** we already have per business, per day:

| Input | Meaning |
| :---- | :---- |
| Search metrics | Impressions, Clicks (from the existing GSC time series we store today) |
| Engagement metrics | Organic users, Goals/Conversions |
| Business status | The existing per-business signal: **strong / dip / check / no signal** |
| Product usage | Pages published, reports generated, reports opened, new connections, failed jobs |
| Billing | Subscription state (active/trial/past-due/churned), plan, MRR |
| API cost | Cost per business, split by provider (OpenAI, Anthropic, DataForSEO, Serper, other) |
| Attributes | Agency, industry, CMS, state, country, business category, plan, tenure |

Each record carries its attributes so any metric can be grouped by any attribute. **Use only fields that already exist on the business profile — when in doubt, reuse an existing field rather than inventing a new one.**

## 3\. What comes out

Seven modules, all sharing one layout: **KPI cards** (current value, % change vs previous period, sparkline) \+ a **breakdown table** (Group · Current · Previous · Δ · % Change · % of Total · Trend), sortable/filterable/exportable.

1. **Network Performance** — Impressions, Clicks, CTR, Organic Users, Goals.  
2. **Growth** — count of businesses in each status (strong/dip/check/no signal), new businesses, pages published, reports generated, reports opened, new connections, failed jobs.  
3. **API Cost** — total cost and cost per business, broken down by provider.  
4. **Industry** — the metrics above benchmarked per industry.  
5. **Category Insights** — same metrics grouped by *any* attribute (agency, CMS, state, plan, tenure, etc.).  
6. **Platform Totals** — total/active/trial businesses, agencies, and connection counts (GSC, GA4, GBP, CMS, publishing-enabled).  
7. **Subscription** — MRR, ARR, **New MRR**, **Retained MRR**, active, trialing, past due, failed payments, churned, new subscriptions.

## 4\. How the core numbers are computed

- **CTR** (any scope) \= **Σ Clicks / Σ Impressions**. Never an average of per-business CTRs.  
- **% change vs previous period** — identical logic to the current business dashboard.  
- **Status rollup** — for any group, count/percent of businesses in each of strong/dip/check/no signal.  
- **New MRR** — MRR from businesses in their **first** billing month.  
- **Retained MRR** — MRR from businesses in their **second or later** billing month.  
- **All other totals** — plain sums or counts of the fact records in the selected time range and filter.

## 5\. Network & agency intelligence (deterministic)

The differentiator, done as fixed formulas — not a model:

- **Same engine, two scopes.** Network intelligence \= a metric grouped across all businesses. Agency intelligence \= the *same* computation filtered to one agency, compared against the network.  
- **Benchmarks are distributions.** For any metric within any segment, compute the **median and percentile spread** across businesses (not just a total, which whales dominate).  
- **A business/agency's insight** \= its **percentile rank within its cohort** \+ the gap to the cohort median (e.g. "your dental clients are at the 30th percentile for CTR; network median 4.2%, you're at 2.8%").  
- **Leave-one-out.** When scoring an agency, its own businesses are excluded from the benchmark it's compared to.  
- **Status distribution by segment** (e.g. "38% of home-services businesses are in dip vs 12% network-wide") is a first-class intelligence output, since status is our atomic signal.

## 6\. Rules & invariants

- CTR is always ratio-of-sums; never averaged.  
- Benchmarks compare like-for-like cohorts (segment \+ tenure) and always exclude the entity being scored.  
- Numbers reflect the selected time range and active filters consistently across every module.  
- No causal/correlation claims in v1 (deferred to a future ML phase).

## 7\. Parameters

| Parameter | Default | Effect |
| :---- | :---- | :---- |
| Time ranges | Last 7 / 28 days, MTD, Last Month, QTD, YTD, Lifetime | Window for all metrics (no Today/Yesterday) |
| Comparison period | Same as current business dash | Basis for % change |
| Minimum cohort size | **none** (show all, given low business count today) | Revisit when business count grows |
| Benchmark statistic | Median \+ percentile rank | How a business/agency is positioned vs its cohort |



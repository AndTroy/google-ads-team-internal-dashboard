# Google Ads Team Internal Dashboard

Internal dashboard for tracking Brand Fund Search campaign budgets (PayPerWash Search, Unlimited/Regional Search, Fleet Search), with the Budget Pacing table from the RMC dashboard underneath.

Single self-contained `index.html` (client-side JS, no build step). Deploy by serving the repo root with GitHub Pages.

## Data

The page reads Google Sheets through the `gviz` CSV endpoint. Both sheets must stay link-shared (anyone with the link can view).

| Section | Sheet | Tab(s) |
|---|---|---|
| Brand Fund Search budgets | Brand Fund Budget Feed (`BF_SHEET_ID` in `index.html`) | `Campaign Feed`, `Budget Feed`, `Region Sites` |
| Budget Pacing | Budget simulator sheet (`PACE_CSV_URL` in `index.html`) | `Budget Tracker Feed` |

- **Campaign Feed**: written each morning by the Google Ads script `brand_fund_budget_feed.js` (runs in the Brand Fund account). One row per campaign with status, current daily budget and month-to-date spend through yesterday.
- **Budget Feed**: monthly budget per campaign type (`PPW Search`, `Unlimited Search`, `Fleet Search`), copied from the Brand Fund tabs of the 2026 PMT Annual Plan workbook. The workbook is never edited. Add a new row set each month (`Month` as `YYYY-MM`).
- **Region Sites**: open wash sites per region (from Yext: active folder, not closed). The PPW and Unlimited budgets are split across the six regional campaigns by each region's share of open sites. Refresh occasionally.

## Pace math

- Needed Daily Spend = (Month Budget - Spend To Date) / Days Left
- Projected Month-End = month-to-date daily average x days in month
- Pace: Under below 90% of budget, Over above 110%

Status shown per campaign (Active / Paused / Ended) is the campaign status in Google Ads. Paused campaigns keep their budget share.

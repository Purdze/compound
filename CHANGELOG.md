# Changelog

What's changed in each version of Compound. To update, run `docker compose pull && docker compose up -d` in your `compound` folder.

## Unreleased

- **What's new** page, linked from the bottom of Settings, listing the changes in each version.
- After an update, Compound shows a one-time note with a link to what's new.

## 0.2.1 (2026-09-26)

- **Check for updates** in Settings, next to the version. It asks GitHub straight away instead of waiting for the twice-daily check.
- The update banner is more reliable: if GitHub can't be reached, Compound tries again after five minutes instead of twelve hours.
- Clearer error messages when a form is sent with a missing field.

## 0.2.0 (2026-09-26)

**Action needed for Deposits:** the new Deposits page needs the **History - Transactions** permission. Trading 212 keys can't be edited, so create a new read-only key with **Account data**, **Portfolio** and **History - Transactions** turned on, then use **Settings → Trading 212 API key → Replace key**.

- **Deposits page:** how much you've put in and taken out, what it's worth now, and your return overall and as a yearly rate. Includes a month-by-month chart and every transaction.
- **Worth and money put in:** Compound records your portfolio's value once a day and charts it against what you've deposited. It fills in from the day you update.
- The dashboard shows a one-line summary of what you've put in and your overall return.
- The goal simulator compares your actual average monthly deposit with what your goal needs.

## 0.1.0 (2026-09-25)

First release.

- Dashboard with your portfolio's total value, cash, invested amount, gain and every position, updating every minute.
- Goal simulator: how much to invest each month to reach a goal by a given age, with presets you can save.
- VUAG price in the header if you hold it.
- Key activity log in Settings, showing every call Compound makes to Trading 212.
- Setup screen on first start, password sign-in, and an update banner when a new version is out.

---
name: lighthouse-audit
description: Run Lighthouse performance audit on the storefront and report Core Web Vitals
disable-model-invocation: true
---

# Lighthouse Audit

Runs a Lighthouse performance audit against the storefront and reports key metrics.

## Steps

1. Check if Lighthouse CLI is available:
   ```bash
   npx lighthouse --version 2>/dev/null
   ```
   If not available, it will be fetched automatically via npx.

2. Ask the user for the URL to audit:
   - **Production**: `https://chacra5162.github.io/QAMFSHOP/`
   - **Local**: If serving locally, use that URL
   - Default to production if user doesn't specify

3. Run the audit:
   ```bash
   npx lighthouse <url> --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo
   ```

4. Parse the JSON report and extract:
   - **Performance** score (0-100)
   - **Accessibility** score (0-100)
   - **Best Practices** score (0-100)
   - **SEO** score (0-100)
   - **Core Web Vitals**: LCP, FID/INP, CLS
   - **Opportunities**: top 3 suggestions with estimated savings

5. Output a summary:
   ```
   ## Lighthouse Audit — [url]

   | Metric         | Score | Status |
   |----------------|-------|--------|
   | Performance    | XX    | 🟢/🟡/🔴 |
   | Accessibility  | XX    | 🟢/🟡/🔴 |
   | Best Practices | XX    | 🟢/🟡/🔴 |
   | SEO            | XX    | 🟢/🟡/🔴 |

   ### Core Web Vitals
   - LCP: X.Xs
   - INP: Xms
   - CLS: X.XX

   ### Top Opportunities
   1. [opportunity] — save ~X.Xs
   2. [opportunity] — save ~X.Xs
   3. [opportunity] — save ~X.Xs
   ```

6. Clean up the report file:
   ```bash
   rm lighthouse-report.json
   ```

7. If scores are below thresholds (Performance < 90, Accessibility < 90), suggest specific fixes relevant to the codebase.

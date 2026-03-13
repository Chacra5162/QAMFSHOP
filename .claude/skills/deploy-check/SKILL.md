---
name: deploy-check
description: Pre-deploy validation — checks HTML structure, data files, and security before pushing to main
disable-model-invocation: true
---

# Deploy Check

Validates the project is safe and correct before deploying to GitHub Pages (pushing to main triggers auto-deploy).

## Checks to Run

### 1. HTML Validation
- Verify `index.html` exists and is not empty
- Check that opening `<html>`, `<head>`, `<body>` tags exist
- Verify the closing `</html>` tag exists
- Ensure all three page divs exist: `#page-store`, `#page-marketing`, `#page-admin`
- Check that the `<script>` block exists and contains `handleRoute`

### 2. Data File Validation
- Verify `products.json` exists and is valid JSON with a `products` array
- Verify `custom-products.json` exists and is valid JSON with a `products` array
- Check that at least one product exists across both files

### 3. Security Checks
- Scan `index.html` for hardcoded API keys or tokens (look for patterns like `sk_`, `pk_test_`, `Bearer `, API key patterns)
- Verify `.env` is in `.gitignore`
- Check that no `.env` file is staged for commit (`git status`)
- Verify admin password hash is not the default "password" hash — warn if it is

### 4. Asset Checks
- Verify Google Fonts link loads (Syne + Outfit)
- Check that SVG logos render (bowling ball motif exists in HTML)

### 5. Git Status
- Show current branch and uncommitted changes
- Show what will be deployed (diff from remote main)

## Output

Report results as a checklist with pass/fail for each check. If any critical checks fail, recommend NOT deploying and list what needs to be fixed.

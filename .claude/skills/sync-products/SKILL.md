---
name: sync-products
description: Sync products from Printify API or generate demo data, then validate the output
disable-model-invocation: true
---

# Sync Products

Syncs product data from Printify and validates the result.

## Steps

1. Ask the user which mode to run:
   - **Demo mode** (`npm run sync:demo`) — generates sample data without API credentials
   - **Live mode** (`npm run sync`) — fetches from Printify API (requires `.env` with `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID`)

2. Run the selected sync command using Bash

3. After sync completes, validate the output:
   - Read `products.json` and verify it's valid JSON
   - Check that `products` array exists and has items
   - Verify each product has required fields: `id`, `title`, `category`, `variants`, `images`
   - Check that `price_range` has valid `min` and `max` values
   - Report total product count, variant count, and any validation issues

4. If validation passes, report success with a summary:
   - Number of products synced
   - Categories found
   - Total variants across all products

5. If validation fails, report specific errors and suggest fixes

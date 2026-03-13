#!/usr/bin/env node
/**
 * Printify Product Sync Script
 *
 * Fetches all published products from your Printify shop (including sizes,
 * colors, and all variants) and writes them to products.json for the storefront.
 *
 * Usage:
 *   npm run sync         # Sync from live Printify API (requires .env)
 *   npm run sync:demo    # Generate demo product data for preview
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const PRINTIFY_BASE = 'api.printify.com';
const OUTPUT_FILE = path.join(__dirname, 'products.json');
const IS_DEMO = process.argv.includes('--demo');

// ─── Printify API helper ────────────────────────────────────────────────────

function printifyRequest(endpoint) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error(
      'PRINTIFY_API_TOKEN not set. Copy .env.example to .env and add your token.\n' +
      'Get one at: https://printify.com/app/account/api'
    );
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: PRINTIFY_BASE,
      path: `/v1/${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'QAMFSHOP-Sync/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Printify API ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Printify response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ─── Fetch all products with pagination ─────────────────────────────────────

async function fetchAllProducts(shopId) {
  let page = 1;
  let allProducts = [];

  console.log(`Fetching products from shop ${shopId}...`);

  while (true) {
    const response = await printifyRequest(
      `shops/${shopId}/products.json?page=${page}&limit=100`
    );

    // Printify API returns { current_page, last_page, data: [...] }
    const products = response.data || (Array.isArray(response) ? response : []);
    if (products.length === 0) break;

    allProducts = allProducts.concat(products);
    console.log(`  Page ${page}: ${products.length} products`);

    // Check if there are more pages
    if (response.last_page && page < response.last_page) {
      page++;
    } else if (products.length === 100) {
      // Fallback: if no pagination metadata, use count heuristic
      page++;
    } else {
      break;
    }
  }

  return allProducts;
}

// ─── Transform Printify product to storefront format ────────────────────────

function transformProduct(product) {
  // Extract unique sizes from variants
  const sizes = [];
  const colors = [];
  const variants = [];

  for (const variant of (product.variants || [])) {
    if (!variant.is_enabled) continue;

    const variantData = {
      id: variant.id,
      title: variant.title,
      price: variant.price / 100, // Printify prices are in cents
      sku: variant.sku || '',
      is_available: variant.is_enabled,
      options: {}
    };

    // Parse variant options (size, color, etc.)
    if (variant.options) {
      for (const optionId of Object.keys(variant.options)) {
        const optionValue = variant.options[optionId];
        variantData.options[optionId] = optionValue;
      }
    }

    // Extract size and color from title (e.g., "Black / S", "Red / XL")
    const parts = variant.title.split(' / ').map(s => s.trim());
    if (parts.length >= 2) {
      const color = parts[0];
      const size = parts[1];
      if (!colors.includes(color)) colors.push(color);
      if (!sizes.includes(size)) sizes.push(size);
      variantData.color = color;
      variantData.size = size;
    } else if (parts.length === 1) {
      // Single option variant (e.g., just a size or just a color)
      variantData.option = parts[0];
      if (!sizes.includes(parts[0])) sizes.push(parts[0]);
    }

    variants.push(variantData);
  }

  // Get images
  const images = (product.images || [])
    .filter(img => img.is_default || img.position !== undefined)
    .sort((a, b) => {
      if (a.is_default) return -1;
      if (b.is_default) return 1;
      return (a.position || 0) - (b.position || 0);
    })
    .map(img => ({
      src: img.src,
      variant_ids: img.variant_ids || [],
      is_default: img.is_default || false
    }));

  // Compute price range
  const enabledPrices = variants
    .map(v => v.price)
    .filter(p => p > 0);
  const minPrice = enabledPrices.length > 0 ? Math.min(...enabledPrices) : 0;
  const maxPrice = enabledPrices.length > 0 ? Math.max(...enabledPrices) : 0;

  // Determine category from tags or product type
  const tags = (product.tags || []).map(t => t.toLowerCase());
  let category = 'Other';
  if (tags.some(t => t.includes('shirt') || t.includes('tee'))) category = 'T-Shirts';
  else if (tags.some(t => t.includes('hoodie') || t.includes('sweatshirt'))) category = 'Hoodies';
  else if (tags.some(t => t.includes('polo'))) category = 'Polos';
  else if (tags.some(t => t.includes('jacket') || t.includes('coat'))) category = 'Jackets';
  else if (tags.some(t => t.includes('hat') || t.includes('cap') || t.includes('beanie'))) category = 'Hats & Caps';
  else if (tags.some(t => t.includes('bag') || t.includes('backpack') || t.includes('tote'))) category = 'Bags';
  else if (tags.some(t => t.includes('mug') || t.includes('bottle') || t.includes('tumbler') || t.includes('drink'))) category = 'Drinkware';

  return {
    id: product.id,
    title: product.title,
    description: product.description || '',
    tags: product.tags || [],
    category,
    images,
    sizes,
    colors,
    variants,
    price: minPrice,
    priceMax: maxPrice,
    priceFormatted: minPrice === maxPrice
      ? `$${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`,
    is_published: product.visible || false,
    created_at: product.created_at,
    updated_at: product.updated_at,
    printify_url: product.external?.link || null
  };
}

// ─── Demo data generator ────────────────────────────────────────────────────

function generateDemoProducts() {
  console.log('Generating demo product data...\n');

  const demoProducts = [
    {
      id: 'demo-001',
      title: 'Strike Force Tee',
      description: 'Premium 100% cotton crew neck tee with front logo print. Unisex fit.',
      tags: ['t-shirt', 'tee', 'apparel', 'new'],
      category: 'T-Shirts',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      colors: ['Black', 'Red', 'White', 'Navy'],
      variants: [
        { id: 'v1', title: 'Black / S', price: 28.00, sku: 'SFT-BLK-S', color: 'Black', size: 'S', is_available: true },
        { id: 'v2', title: 'Black / M', price: 28.00, sku: 'SFT-BLK-M', color: 'Black', size: 'M', is_available: true },
        { id: 'v3', title: 'Black / L', price: 28.00, sku: 'SFT-BLK-L', color: 'Black', size: 'L', is_available: true },
        { id: 'v4', title: 'Black / XL', price: 28.00, sku: 'SFT-BLK-XL', color: 'Black', size: 'XL', is_available: true },
        { id: 'v5', title: 'Black / 2XL', price: 30.00, sku: 'SFT-BLK-2XL', color: 'Black', size: '2XL', is_available: true },
        { id: 'v6', title: 'Black / 3XL', price: 30.00, sku: 'SFT-BLK-3XL', color: 'Black', size: '3XL', is_available: true },
        { id: 'v7', title: 'Red / S', price: 28.00, sku: 'SFT-RED-S', color: 'Red', size: 'S', is_available: true },
        { id: 'v8', title: 'Red / M', price: 28.00, sku: 'SFT-RED-M', color: 'Red', size: 'M', is_available: true },
        { id: 'v9', title: 'Red / L', price: 28.00, sku: 'SFT-RED-L', color: 'Red', size: 'L', is_available: true },
        { id: 'v10', title: 'Red / XL', price: 28.00, sku: 'SFT-RED-XL', color: 'Red', size: 'XL', is_available: true },
        { id: 'v11', title: 'White / S', price: 28.00, sku: 'SFT-WHT-S', color: 'White', size: 'S', is_available: true },
        { id: 'v12', title: 'White / M', price: 28.00, sku: 'SFT-WHT-M', color: 'White', size: 'M', is_available: true },
        { id: 'v13', title: 'White / L', price: 28.00, sku: 'SFT-WHT-L', color: 'White', size: 'L', is_available: true },
        { id: 'v14', title: 'White / XL', price: 28.00, sku: 'SFT-WHT-XL', color: 'White', size: 'XL', is_available: true },
        { id: 'v15', title: 'Navy / S', price: 28.00, sku: 'SFT-NAV-S', color: 'Navy', size: 'S', is_available: true },
        { id: 'v16', title: 'Navy / M', price: 28.00, sku: 'SFT-NAV-M', color: 'Navy', size: 'M', is_available: true },
        { id: 'v17', title: 'Navy / L', price: 28.00, sku: 'SFT-NAV-L', color: 'Navy', size: 'L', is_available: true },
        { id: 'v18', title: 'Navy / XL', price: 28.00, sku: 'SFT-NAV-XL', color: 'Navy', size: 'XL', is_available: true }
      ],
      price: 28.00,
      priceMax: 30.00,
      priceFormatted: '$28.00 – $30.00',
      is_published: true,
      badge: 'new'
    },
    {
      id: 'demo-002',
      title: 'Lane Legend Hoodie',
      description: 'Heavyweight fleece hoodie with embroidered chest logo and kangaroo pocket.',
      tags: ['hoodie', 'sweatshirt', 'apparel'],
      category: 'Hoodies',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Navy', 'Red', 'Charcoal'],
      variants: [
        { id: 'v20', title: 'Navy / S', price: 52.00, sku: 'LLH-NAV-S', color: 'Navy', size: 'S', is_available: true },
        { id: 'v21', title: 'Navy / M', price: 52.00, sku: 'LLH-NAV-M', color: 'Navy', size: 'M', is_available: true },
        { id: 'v22', title: 'Navy / L', price: 52.00, sku: 'LLH-NAV-L', color: 'Navy', size: 'L', is_available: true },
        { id: 'v23', title: 'Navy / XL', price: 52.00, sku: 'LLH-NAV-XL', color: 'Navy', size: 'XL', is_available: true },
        { id: 'v24', title: 'Navy / 2XL', price: 55.00, sku: 'LLH-NAV-2XL', color: 'Navy', size: '2XL', is_available: true },
        { id: 'v25', title: 'Red / S', price: 52.00, sku: 'LLH-RED-S', color: 'Red', size: 'S', is_available: true },
        { id: 'v26', title: 'Red / M', price: 52.00, sku: 'LLH-RED-M', color: 'Red', size: 'M', is_available: true },
        { id: 'v27', title: 'Red / L', price: 52.00, sku: 'LLH-RED-L', color: 'Red', size: 'L', is_available: true },
        { id: 'v28', title: 'Red / XL', price: 52.00, sku: 'LLH-RED-XL', color: 'Red', size: 'XL', is_available: true },
        { id: 'v29', title: 'Charcoal / S', price: 52.00, sku: 'LLH-CHR-S', color: 'Charcoal', size: 'S', is_available: true },
        { id: 'v30', title: 'Charcoal / M', price: 52.00, sku: 'LLH-CHR-M', color: 'Charcoal', size: 'M', is_available: true },
        { id: 'v31', title: 'Charcoal / L', price: 52.00, sku: 'LLH-CHR-L', color: 'Charcoal', size: 'L', is_available: true },
        { id: 'v32', title: 'Charcoal / XL', price: 52.00, sku: 'LLH-CHR-XL', color: 'Charcoal', size: 'XL', is_available: true }
      ],
      price: 52.00,
      priceMax: 55.00,
      priceFormatted: '$52.00 – $55.00',
      is_published: true,
      badge: null
    },
    {
      id: 'demo-003',
      title: 'AMF Pro Snapback',
      description: 'Structured 6-panel cap with flat brim and embroidered logo.',
      tags: ['hat', 'cap', 'snapback', 'accessories'],
      category: 'Hats & Caps',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['One Size'],
      colors: ['Black', 'Red', 'Dark Red'],
      variants: [
        { id: 'v40', title: 'Black / One Size', price: 35.00, sku: 'APS-BLK', color: 'Black', size: 'One Size', is_available: true },
        { id: 'v41', title: 'Red / One Size', price: 35.00, sku: 'APS-RED', color: 'Red', size: 'One Size', is_available: true },
        { id: 'v42', title: 'Dark Red / One Size', price: 35.00, sku: 'APS-DKR', color: 'Dark Red', size: 'One Size', is_available: true }
      ],
      price: 35.00,
      priceMax: 35.00,
      priceFormatted: '$35.00',
      is_published: true,
      badge: 'staff'
    },
    {
      id: 'demo-004',
      title: 'Pinspotter Mug',
      description: '15oz ceramic mug with glossy finish. Dishwasher and microwave safe.',
      tags: ['mug', 'drinkware', 'new'],
      category: 'Drinkware',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['15oz'],
      colors: ['White', 'Black', 'Red'],
      variants: [
        { id: 'v50', title: 'White / 15oz', price: 22.00, sku: 'PSM-WHT', color: 'White', size: '15oz', is_available: true },
        { id: 'v51', title: 'Black / 15oz', price: 22.00, sku: 'PSM-BLK', color: 'Black', size: '15oz', is_available: true },
        { id: 'v52', title: 'Red / 15oz', price: 22.00, sku: 'PSM-RED', color: 'Red', size: '15oz', is_available: true }
      ],
      price: 22.00,
      priceMax: 22.00,
      priceFormatted: '$22.00',
      is_published: true,
      badge: 'new'
    },
    {
      id: 'demo-005',
      title: 'EDGE Series Jacket',
      description: 'Lightweight softshell jacket. Full-zip with water-resistant finish.',
      tags: ['jacket', 'outerwear', 'apparel'],
      category: 'Jackets',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'Navy'],
      variants: [
        { id: 'v60', title: 'Black / S', price: 89.00, sku: 'ESJ-BLK-S', color: 'Black', size: 'S', is_available: true },
        { id: 'v61', title: 'Black / M', price: 89.00, sku: 'ESJ-BLK-M', color: 'Black', size: 'M', is_available: true },
        { id: 'v62', title: 'Black / L', price: 89.00, sku: 'ESJ-BLK-L', color: 'Black', size: 'L', is_available: true },
        { id: 'v63', title: 'Black / XL', price: 89.00, sku: 'ESJ-BLK-XL', color: 'Black', size: 'XL', is_available: true },
        { id: 'v64', title: 'Black / 2XL', price: 92.00, sku: 'ESJ-BLK-2XL', color: 'Black', size: '2XL', is_available: true },
        { id: 'v65', title: 'Navy / S', price: 89.00, sku: 'ESJ-NAV-S', color: 'Navy', size: 'S', is_available: true },
        { id: 'v66', title: 'Navy / M', price: 89.00, sku: 'ESJ-NAV-M', color: 'Navy', size: 'M', is_available: true },
        { id: 'v67', title: 'Navy / L', price: 89.00, sku: 'ESJ-NAV-L', color: 'Navy', size: 'L', is_available: true },
        { id: 'v68', title: 'Navy / XL', price: 89.00, sku: 'ESJ-NAV-XL', color: 'Navy', size: 'XL', is_available: true },
        { id: 'v69', title: 'Navy / 2XL', price: 92.00, sku: 'ESJ-NAV-2XL', color: 'Navy', size: '2XL', is_available: true }
      ],
      price: 89.00,
      priceMax: 92.00,
      priceFormatted: '$89.00 – $92.00',
      is_published: true,
      badge: 'limited'
    },
    {
      id: 'demo-006',
      title: 'Pro Gear Backpack',
      description: '30L capacity backpack with padded laptop sleeve and screen-print logo.',
      tags: ['bag', 'backpack', 'accessories', 'new'],
      category: 'Bags',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['One Size'],
      colors: ['Black', 'Red'],
      variants: [
        { id: 'v70', title: 'Black / One Size', price: 65.00, sku: 'PGB-BLK', color: 'Black', size: 'One Size', is_available: true },
        { id: 'v71', title: 'Red / One Size', price: 65.00, sku: 'PGB-RED', color: 'Red', size: 'One Size', is_available: true }
      ],
      price: 65.00,
      priceMax: 65.00,
      priceFormatted: '$65.00',
      is_published: true,
      badge: 'new'
    },
    {
      id: 'demo-007',
      title: 'Tournament Polo',
      description: 'Moisture-wicking performance polo with embroidered chest logo.',
      tags: ['polo', 'apparel'],
      category: 'Polos',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'Red', 'White'],
      variants: [
        { id: 'v80', title: 'Black / S', price: 45.00, sku: 'TP-BLK-S', color: 'Black', size: 'S', is_available: true },
        { id: 'v81', title: 'Black / M', price: 45.00, sku: 'TP-BLK-M', color: 'Black', size: 'M', is_available: true },
        { id: 'v82', title: 'Black / L', price: 45.00, sku: 'TP-BLK-L', color: 'Black', size: 'L', is_available: true },
        { id: 'v83', title: 'Black / XL', price: 45.00, sku: 'TP-BLK-XL', color: 'Black', size: 'XL', is_available: true },
        { id: 'v84', title: 'Black / 2XL', price: 48.00, sku: 'TP-BLK-2XL', color: 'Black', size: '2XL', is_available: true },
        { id: 'v85', title: 'Red / S', price: 45.00, sku: 'TP-RED-S', color: 'Red', size: 'S', is_available: true },
        { id: 'v86', title: 'Red / M', price: 45.00, sku: 'TP-RED-M', color: 'Red', size: 'M', is_available: true },
        { id: 'v87', title: 'Red / L', price: 45.00, sku: 'TP-RED-L', color: 'Red', size: 'L', is_available: true },
        { id: 'v88', title: 'Red / XL', price: 45.00, sku: 'TP-RED-XL', color: 'Red', size: 'XL', is_available: true },
        { id: 'v89', title: 'White / S', price: 45.00, sku: 'TP-WHT-S', color: 'White', size: 'S', is_available: true },
        { id: 'v90', title: 'White / M', price: 45.00, sku: 'TP-WHT-M', color: 'White', size: 'M', is_available: true },
        { id: 'v91', title: 'White / L', price: 45.00, sku: 'TP-WHT-L', color: 'White', size: 'L', is_available: true },
        { id: 'v92', title: 'White / XL', price: 45.00, sku: 'TP-WHT-XL', color: 'White', size: 'XL', is_available: true }
      ],
      price: 45.00,
      priceMax: 48.00,
      priceFormatted: '$45.00 – $48.00',
      is_published: true,
      badge: 'staff'
    },
    {
      id: 'demo-008',
      title: 'Strike Water Bottle',
      description: '32oz stainless steel double-wall insulated bottle. Leak-proof lid.',
      tags: ['bottle', 'drinkware'],
      category: 'Drinkware',
      images: [{ src: '', variant_ids: [], is_default: true }],
      sizes: ['32oz'],
      colors: ['Silver', 'Black', 'Red'],
      variants: [
        { id: 'v100', title: 'Silver / 32oz', price: 34.00, sku: 'SWB-SLV', color: 'Silver', size: '32oz', is_available: true },
        { id: 'v101', title: 'Black / 32oz', price: 34.00, sku: 'SWB-BLK', color: 'Black', size: '32oz', is_available: true },
        { id: 'v102', title: 'Red / 32oz', price: 34.00, sku: 'SWB-RED', color: 'Red', size: '32oz', is_available: true }
      ],
      price: 34.00,
      priceMax: 34.00,
      priceFormatted: '$34.00',
      is_published: true,
      badge: null
    }
  ];

  return demoProducts;
}

// ─── Main sync ──────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   QAMFSHOP — Printify Product Sync   ║');
  console.log('╚══════════════════════════════════════╝\n');

  let products;

  if (IS_DEMO) {
    products = generateDemoProducts();
  } else {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    if (!shopId) {
      throw new Error(
        'PRINTIFY_SHOP_ID not set. Copy .env.example to .env and add your shop ID.\n' +
        'Find it at: https://printify.com/app/account/api'
      );
    }

    const rawProducts = await fetchAllProducts(shopId);
    console.log(`\nTotal products fetched: ${rawProducts.length}`);

    // Transform and filter to published products only
    products = rawProducts
      .map(transformProduct)
      .filter(p => p.is_published);

    console.log(`Published products: ${products.length}`);
  }

  // Build category counts
  const categories = {};
  for (const product of products) {
    categories[product.category] = (categories[product.category] || 0) + 1;
  }

  // Build output
  const output = {
    synced_at: new Date().toISOString(),
    source: IS_DEMO ? 'demo' : 'printify',
    total_products: products.length,
    total_variants: products.reduce((sum, p) => sum + p.variants.length, 0),
    categories,
    products
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\nSync complete!`);
  console.log(`  Products: ${output.total_products}`);
  console.log(`  Variants: ${output.total_variants}`);
  console.log(`  Categories: ${Object.keys(categories).join(', ')}`);
  console.log(`  Output: ${OUTPUT_FILE}\n`);

  // Print summary table
  console.log('Product Summary:');
  console.log('─'.repeat(60));
  for (const product of products) {
    const varCount = product.variants.length;
    const sizeCount = product.sizes.length;
    const colorCount = product.colors.length;
    console.log(
      `  ${product.title.padEnd(25)} ${product.priceFormatted.padEnd(18)} ` +
      `${varCount} variants (${sizeCount} sizes, ${colorCount} colors)`
    );
  }
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('\nSync failed:', err.message);
  process.exit(1);
});

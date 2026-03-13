# QAMFSHOP — WordPress Deployment Guide

Step-by-step instructions to deploy the QubicaAMF merch store on WordPress + WooCommerce.

---

## Prerequisites

- WordPress 6.0+ installed and accessible
- Admin access to WordPress dashboard
- Printify account with API access
- Stripe account (for payment processing)

---

## Step 1: Install Required Plugins

In **WordPress Admin → Plugins → Add New**, install and activate:

| Plugin | Purpose | Where to Get |
|--------|---------|--------------|
| **WooCommerce** | Store, cart, checkout, orders | WordPress plugin directory |
| **WooCommerce Stripe Gateway** | Credit card payments | WordPress plugin directory |
| **Printify for WooCommerce** | Auto-sync products + auto-fulfill orders | [printify.com/integrations](https://printify.com/integrations) |
| **QAMF Custom Order Batch Emailer** | Daily email for custom fulfillment items | This repo (see Step 2) |

---

## Step 2: Upload Theme & Plugin

### Theme

1. Download or clone this repo
2. Zip the folder: `wordpress/themes/qamfshop/`
3. Go to **WordPress Admin → Appearance → Themes → Add New → Upload Theme**
4. Upload the zip, install, and activate

### Custom Orders Plugin

1. Zip the folder: `wordpress/plugins/qamf-custom-orders/`
2. Go to **WordPress Admin → Plugins → Add New → Upload Plugin**
3. Upload the zip, install, and activate

---

## Step 3: Configure WooCommerce

### Basic Setup

1. Go to **WooCommerce → Settings → General**
   - Store address: your business address
   - Currency: USD
   - Enable taxes if needed

2. Go to **WooCommerce → Settings → Products**
   - Shop page: select your shop page (or let WooCommerce create one)

3. Go to **WooCommerce → Settings → Shipping**
   - Add shipping zones and rates
   - Printify handles shipping for POD items — you may want a flat rate or free shipping threshold ($75+)

### Stripe Setup

1. Go to **WooCommerce → Settings → Payments**
2. Enable **Stripe - Credit Card**
3. Click **Manage** and enter your Stripe API keys:
   - **Publishable Key**: `pk_live_...` (from Stripe dashboard)
   - **Secret Key**: `sk_live_...` (from Stripe dashboard)
4. Enable **Test Mode** first, verify a test purchase works, then switch to live

### Printify Setup

1. Go to **Printify → Settings → Integrations** in your Printify dashboard
2. Select **WooCommerce** and follow the connection wizard
3. Once connected, go to **Printify → My Products** and click **Publish** on products you want in the store
4. Products auto-sync to WooCommerce with images, variants, and pricing

---

## Step 4: Add Custom Fulfillment Products

For items NOT fulfilled by Printify (bowling balls, trophies, digital displays, etc.):

1. Go to **WooCommerce → Products → Add New**
2. Fill in product details (title, description, images, price, variants)
3. Scroll to **Product Data** panel
4. Check the **☑ Custom Fulfillment** checkbox
5. Publish the product

These products will:
- Show a **"★ Special Request"** button instead of "Add to Cart"
- Be collected and emailed to the admin daily at 8 AM EST
- Show a **purple "CUSTOM"** badge in the orders list

### Configure Email Recipient

1. Go to **WooCommerce → Custom Order Emails**
2. Set the **Recipient Email** (defaults to admin email)
3. Verify the next scheduled run shows correctly (should be tomorrow at 8:00 AM EST)
4. Use **Send Batch Now** button to test with a sample order

---

## Step 5: Set Up Pages

Create these pages in **WordPress Admin → Pages → Add New**:

| Page | Template | Notes |
|------|----------|-------|
| **Home** | Default | Set as front page in Settings → Reading |
| **Shop** | — | Auto-created by WooCommerce |
| **Cart** | — | Auto-created by WooCommerce |
| **Checkout** | — | Auto-created by WooCommerce |
| **My Account** | — | Auto-created by WooCommerce |
| **Marketing** | Marketing Page | Select "Marketing Page" template in Page Attributes |
| **Shipping & Returns** | Default | Add your shipping/returns policy |
| **Privacy Policy** | Default | Add your privacy policy |
| **Contact** | Default | Add contact form (use WPForms or similar) |

### Set Front Page

1. Go to **Settings → Reading**
2. Select **A static page**
3. **Homepage**: select "Home"
4. **Posts page**: select "Blog" (create one if needed)

---

## Step 6: Set Up Navigation Menus

Go to **Appearance → Menus**:

### Header Navigation (Primary)

| Label | Link |
|-------|------|
| Shop | Shop page |
| Marketing | Marketing page |
| Blog | Blog page |

### Footer Menus

Create 3 menus and assign to Footer Column 1/2/3 locations.

---

## Step 7: Customize Appearance

Go to **Appearance → Customize**:

### Announcement Bar
- Text: `FREE SHIPPING ON ORDERS OVER $75 — USE CODE: QAMF2026`
- Toggle visibility on/off

### Store Hero
- Title: `Official <span>QubicaAMF</span> Merch` (the `<span>` part renders in red)
- Description: Your tagline

---

## Step 8: Test Before Going Live

Run through this checklist:

### Store
- [ ] Homepage loads with hero, products, perks, footer
- [ ] Product cards display correctly with images and prices
- [ ] Clicking a product opens the single product page
- [ ] Add to cart works
- [ ] Cart page shows items with correct totals
- [ ] Checkout completes with Stripe test mode
- [ ] Order appears in WooCommerce → Orders

### Custom Fulfillment
- [ ] Custom products show "★ Special Request" button
- [ ] Custom product orders show "CUSTOM — PENDING" in orders list
- [ ] Manual batch send works (WooCommerce → Custom Order Emails → Send Batch Now)
- [ ] Email arrives with correct order details

### Printify
- [ ] Products synced from Printify appear in WooCommerce
- [ ] Placing an order for a Printify product triggers fulfillment in Printify dashboard
- [ ] Tracking number syncs back to WooCommerce when Printify ships

### Marketing Page
- [ ] Marketing page loads with dark theme
- [ ] Pricing tiers display correctly
- [ ] CTA buttons link to contact page

### Mobile
- [ ] Site is responsive on phone/tablet
- [ ] Hamburger menu works
- [ ] Cart and checkout work on mobile

---

## Order Flow Summary

```
PRINTIFY PRODUCTS:
Customer → Add to Cart → Checkout → Stripe Payment
→ WooCommerce Order Created → Printify Auto-Fulfills → Ships to Customer

CUSTOM PRODUCTS:
Customer → Add to Cart (★ Special Request) → Checkout → Stripe Payment
→ WooCommerce Order Created → Tagged "Custom Pending"
→ 8 AM EST Daily → Batch Email to Admin → Admin Fulfills Manually
```

---

## File Reference

```
wordpress/
├── themes/qamfshop/
│   ├── style.css            ← All CSS (Midnight Lanes theme)
│   ├── functions.php        ← WooCommerce support, menus, customizer
│   ├── header.php           ← Site header, nav, cart button
│   ├── footer.php           ← Dark footer, social links, payment icons
│   ├── front-page.php       ← Homepage: hero, products, perks, blog
│   ├── page-marketing.php   ← Marketing page template (dark theme)
│   ├── index.php            ← Default page/post fallback
│   └── assets/js/theme.js   ← Mobile nav, toasts, AJAX cart updates
│
└── plugins/qamf-custom-orders/
    └── qamf-custom-orders.php  ← Daily batch email for custom orders
```

---

## Troubleshooting

**Products not showing on homepage?**
→ Make sure products are published in WooCommerce and the front page is set in Settings → Reading.

**Printify products not syncing?**
→ Check the Printify plugin connection. Products must be "Published" in Printify, not just "Draft."

**Custom order emails not sending?**
→ Check WooCommerce → Custom Order Emails for the next scheduled run. WordPress cron requires site traffic to trigger — install **WP Crontrol** plugin to verify. For reliable scheduling, add a server-side cron:
```
0 13 * * * wget -q -O /dev/null https://yoursite.com/wp-cron.php
```
(13:00 UTC = 8:00 AM EST)

**Stripe payments failing?**
→ Verify API keys in WooCommerce → Settings → Payments → Stripe. Test with Stripe's test card: `4242 4242 4242 4242`.

**Theme doesn't match the original design exactly?**
→ The WordPress theme uses WooCommerce's product templates. For pixel-perfect matching, WooCommerce template overrides can be added to `themes/qamfshop/woocommerce/` as needed.

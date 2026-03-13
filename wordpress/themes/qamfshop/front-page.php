<?php
/**
 * Front Page Template — Store Homepage
 *
 * Displays hero, trust bar, product grid, perks, and blog feed.
 * Products come from WooCommerce (synced by Printify plugin + manual custom items).
 */

get_header(); ?>

<!-- HERO -->
<section class="store-hero">
    <div class="hero-inner">
        <div class="hero-eyebrow">
            <span class="dot"></span> Official QubicaAMF Gear
        </div>
        <h1><?php echo wp_kses_post(get_theme_mod('hero_title', 'Official <span>QubicaAMF</span> Merch')); ?></h1>
        <p><?php echo esc_html(get_theme_mod('hero_description', 'Premium bowling lifestyle apparel and gear. Made for the lanes, worn everywhere.')); ?></p>
        <a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>" class="hero-cta">
            Shop Collection →
        </a>
    </div>
</section>

<!-- TRUST BAR -->
<div class="trust-bar">
    <div class="trust-item">🚚 Free Shipping $75+</div>
    <div class="trust-item">↩️ 30-Day Returns</div>
    <div class="trust-item">💬 Expert Support</div>
</div>

<!-- CATEGORY PILLS -->
<?php
$product_cats = get_terms([
    'taxonomy'   => 'product_cat',
    'hide_empty' => true,
    'parent'     => 0,
]);
if (!empty($product_cats) && !is_wp_error($product_cats)) : ?>
<div class="category-pills">
    <a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>" class="cat-pill active">All</a>
    <?php foreach ($product_cats as $cat) : ?>
        <a href="<?php echo esc_url(get_term_link($cat)); ?>" class="cat-pill"><?php echo esc_html($cat->name); ?></a>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<!-- FEATURED PRODUCTS -->
<section class="product-grid">
    <?php
    $products = new WP_Query([
        'post_type'      => 'product',
        'posts_per_page' => 12,
        'post_status'    => 'publish',
    ]);

    if ($products->have_posts()) :
        while ($products->have_posts()) : $products->the_post();
            wc_get_template_part('content', 'product');
        endwhile;
        wp_reset_postdata();
    else : ?>
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px">
            <p style="font-size:48px;margin-bottom:16px">🎳</p>
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:8px">Products Coming Soon</h3>
            <p style="color:var(--muted)">Connect the Printify plugin to sync your catalog, or add products manually in WooCommerce.</p>
        </div>
    <?php endif; ?>
</section>

<!-- PERKS -->
<div class="perks-strip">
    <div class="perk">
        <div class="perk-icon">🎳</div>
        <div class="perk-title">Bowling Lifestyle</div>
        <div class="perk-desc">Designed for the lanes</div>
    </div>
    <div class="perk">
        <div class="perk-icon">🏭</div>
        <div class="perk-title">QubicaAMF Quality</div>
        <div class="perk-desc">World's #1 bowling company</div>
    </div>
    <div class="perk">
        <div class="perk-icon">📦</div>
        <div class="perk-title">Print on Demand</div>
        <div class="perk-desc">Made to order, no waste</div>
    </div>
    <div class="perk">
        <div class="perk-icon">🔒</div>
        <div class="perk-title">Secure Checkout</div>
        <div class="perk-desc">Stripe-powered payments</div>
    </div>
    <div class="perk">
        <div class="perk-icon">🌍</div>
        <div class="perk-title">Ships Worldwide</div>
        <div class="perk-desc">Global delivery options</div>
    </div>
</div>

<!-- BLOG FEED -->
<?php
$blog_posts = new WP_Query([
    'posts_per_page' => 3,
    'post_status'    => 'publish',
]);
if ($blog_posts->have_posts()) : ?>
<section style="max-width:1400px;margin:40px auto;padding:0 40px">
    <h2 style="font-family:var(--font-display);font-size:28px;font-weight:800;letter-spacing:-.02em;margin-bottom:24px">From the Blog</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
        <?php while ($blog_posts->have_posts()) : $blog_posts->the_post(); ?>
        <a href="<?php the_permalink(); ?>" style="background:var(--white);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--line);transition:transform .3s">
            <?php if (has_post_thumbnail()) : ?>
                <?php the_post_thumbnail('medium_large', ['style' => 'width:100%;height:200px;object-fit:cover']); ?>
            <?php endif; ?>
            <div style="padding:20px">
                <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px"><?php echo get_the_date(); ?></div>
                <div style="font-weight:600;font-size:15px;line-height:1.3"><?php the_title(); ?></div>
            </div>
        </a>
        <?php endwhile; wp_reset_postdata(); ?>
    </div>
</section>
<?php endif; ?>

<?php get_footer();

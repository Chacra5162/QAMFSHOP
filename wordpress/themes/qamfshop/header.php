<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<?php if (get_theme_mod('announce_visible', true)) : ?>
<div class="announce-bar">
    <?php echo esc_html(get_theme_mod('announce_text', 'FREE SHIPPING ON ORDERS OVER $75 — USE CODE: QAMF2026')); ?>
</div>
<?php endif; ?>

<header class="site-header">
    <div class="header-inner">
        <a href="<?php echo esc_url(home_url('/')); ?>" class="site-logo">
            <?php echo qamfshop_logo_svg(); ?>
            <div>
                <div style="font-size:16px;line-height:1">QAMF</div>
                <div style="font-size:9px;font-weight:400;color:var(--muted);letter-spacing:.15em;font-family:var(--font-body)">OFFICIAL MERCH</div>
            </div>
        </a>

        <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle menu">☰</button>

        <nav class="header-nav">
            <?php
            wp_nav_menu([
                'theme_location' => 'primary',
                'container'      => false,
                'items_wrap'     => '%3$s',
                'fallback_cb'    => function() {
                    echo '<a href="' . esc_url(wc_get_page_permalink('shop')) . '">Shop</a>';
                    echo '<a href="' . esc_url(home_url('/marketing')) . '">Marketing</a>';
                },
            ]);
            ?>
        </nav>

        <div class="header-actions">
            <?php if (function_exists('WC')) : ?>
            <a href="<?php echo esc_url(wc_get_cart_url()); ?>" class="cart-link">
                🛒 <span class="cart-count"><?php echo WC()->cart->get_cart_contents_count(); ?></span>
            </a>
            <?php endif; ?>

            <?php if (is_user_logged_in()) : ?>
                <a href="<?php echo esc_url(wc_get_account_endpoint_url('dashboard')); ?>">My Account</a>
            <?php else : ?>
                <a href="<?php echo esc_url(wc_get_page_permalink('myaccount')); ?>">Sign In</a>
            <?php endif; ?>
        </div>
    </div>
</header>

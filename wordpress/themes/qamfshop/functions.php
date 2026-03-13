<?php
/**
 * QAMFSHOP Theme Functions
 *
 * WooCommerce-ready theme with Printify integration support.
 * Designed for plug-and-play deployment.
 */

if (!defined('ABSPATH')) exit;

// ─── Theme Setup ──────────────────────────────────────────────────────────────

function qamfshop_setup() {
    // Document title
    add_theme_support('title-tag');

    // Featured images
    add_theme_support('post-thumbnails');

    // Custom logo
    add_theme_support('custom-logo', [
        'height'      => 68,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ]);

    // HTML5 markup
    add_theme_support('html5', [
        'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script',
    ]);

    // WooCommerce support
    add_theme_support('woocommerce');
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');

    // Navigation menus
    register_nav_menus([
        'primary'   => 'Header Navigation',
        'footer-1'  => 'Footer Column 1',
        'footer-2'  => 'Footer Column 2',
        'footer-3'  => 'Footer Column 3',
    ]);

    // Image sizes for product cards
    add_image_size('product-card', 400, 400, true);
    add_image_size('product-hero', 800, 800, false);
}
add_action('after_setup_theme', 'qamfshop_setup');

// ─── Enqueue Styles & Scripts ─────────────────────────────────────────────────

function qamfshop_enqueue() {
    // Google Fonts: Syne + Outfit
    wp_enqueue_style(
        'qamfshop-fonts',
        'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap',
        [],
        null
    );

    // Theme stylesheet
    wp_enqueue_style('qamfshop-style', get_stylesheet_uri(), ['qamfshop-fonts'], wp_get_theme()->get('Version'));

    // Theme JavaScript
    wp_enqueue_script('qamfshop-js', get_template_directory_uri() . '/assets/js/theme.js', [], wp_get_theme()->get('Version'), true);

    // Pass data to JS
    wp_localize_script('qamfshop-js', 'qamfshop', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('qamfshop_nonce'),
    ]);
}
add_action('wp_enqueue_scripts', 'qamfshop_enqueue');

// ─── WooCommerce Customizations ───────────────────────────────────────────────

// Remove default WooCommerce wrappers and add our own
remove_action('woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10);
remove_action('woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10);

function qamfshop_wc_wrapper_start() {
    echo '<main class="site-main woocommerce-main">';
}
function qamfshop_wc_wrapper_end() {
    echo '</main>';
}
add_action('woocommerce_before_main_content', 'qamfshop_wc_wrapper_start', 10);
add_action('woocommerce_after_main_content', 'qamfshop_wc_wrapper_end', 10);

// Products per page
add_filter('loop_shop_per_page', function() { return 12; });

// Products per row
add_filter('loop_shop_columns', function() { return 4; });

// Remove default WooCommerce sidebar
remove_action('woocommerce_sidebar', 'woocommerce_get_sidebar', 10);

// Add "Custom Fulfillment" badge to product cards
add_action('woocommerce_before_shop_loop_item_title', function() {
    global $product;
    if (get_post_meta($product->get_id(), '_qamf_custom_fulfillment', true) === 'yes') {
        echo '<span class="custom-badge">★ Special Request</span>';
    }
}, 15);

// Change "Add to Cart" text for custom fulfillment products
add_filter('woocommerce_product_add_to_cart_text', function($text, $product) {
    if (get_post_meta($product->get_id(), '_qamf_custom_fulfillment', true) === 'yes') {
        return '★ Special Request';
    }
    return $text;
}, 10, 2);

add_filter('woocommerce_product_single_add_to_cart_text', function($text, $product) {
    if (get_post_meta($product->get_id(), '_qamf_custom_fulfillment', true) === 'yes') {
        return '★ Submit Special Request';
    }
    return $text;
}, 10, 2);

// Add custom CSS class to custom fulfillment product cards
add_filter('woocommerce_post_class', function($classes, $product) {
    if (get_post_meta($product->get_id(), '_qamf_custom_fulfillment', true) === 'yes') {
        $classes[] = 'custom-fulfillment';
    }
    return $classes;
}, 10, 2);

// ─── Widget Areas ─────────────────────────────────────────────────────────────

function qamfshop_widgets_init() {
    register_sidebar([
        'name'          => 'Footer Widget Area',
        'id'            => 'footer-widgets',
        'before_widget' => '<div class="footer-widget">',
        'after_widget'  => '</div>',
        'before_title'  => '<h4 class="widget-title">',
        'after_title'   => '</h4>',
    ]);
}
add_action('widgets_init', 'qamfshop_widgets_init');

// ─── Custom Page Templates ────────────────────────────────────────────────────

// Register the Marketing page template
add_filter('theme_page_templates', function($templates) {
    $templates['page-marketing.php'] = 'Marketing Page';
    return $templates;
});

// ─── Announcement Bar (Customizer) ────────────────────────────────────────────

function qamfshop_customizer($wp_customize) {
    // Announcement bar section
    $wp_customize->add_section('qamfshop_announce', [
        'title'    => 'Announcement Bar',
        'priority' => 30,
    ]);

    $wp_customize->add_setting('announce_text', [
        'default'           => 'FREE SHIPPING ON ORDERS OVER $75 — USE CODE: QAMF2026',
        'sanitize_callback' => 'sanitize_text_field',
    ]);

    $wp_customize->add_control('announce_text', [
        'label'   => 'Announcement Text',
        'section' => 'qamfshop_announce',
        'type'    => 'text',
    ]);

    $wp_customize->add_setting('announce_visible', [
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ]);

    $wp_customize->add_control('announce_visible', [
        'label'   => 'Show Announcement Bar',
        'section' => 'qamfshop_announce',
        'type'    => 'checkbox',
    ]);

    // Store hero section
    $wp_customize->add_section('qamfshop_hero', [
        'title'    => 'Store Hero',
        'priority' => 31,
    ]);

    $wp_customize->add_setting('hero_title', [
        'default'           => 'Official <span>QubicaAMF</span> Merch',
        'sanitize_callback' => 'wp_kses_post',
    ]);

    $wp_customize->add_control('hero_title', [
        'label'   => 'Hero Title (HTML allowed for <span> color)',
        'section' => 'qamfshop_hero',
        'type'    => 'text',
    ]);

    $wp_customize->add_setting('hero_description', [
        'default'           => 'Premium bowling lifestyle apparel and gear. Made for the lanes, worn everywhere.',
        'sanitize_callback' => 'sanitize_text_field',
    ]);

    $wp_customize->add_control('hero_description', [
        'label'   => 'Hero Description',
        'section' => 'qamfshop_hero',
        'type'    => 'textarea',
    ]);
}
add_action('customize_register', 'qamfshop_customizer');

// ─── Helper: SVG Logo ─────────────────────────────────────────────────────────

function qamfshop_logo_svg() {
    return '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:34px;height:34px"><circle cx="20" cy="20" r="18" stroke="#E8192C" stroke-width="3"/><circle cx="20" cy="20" r="11" stroke="#E8192C" stroke-width="2.5"/><circle cx="20" cy="20" r="4.5" fill="#E8192C"/></svg>';
}

// ─── Performance: Preconnect to Google Fonts ──────────────────────────────────

add_action('wp_head', function() {
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
}, 1);

// ─── WooCommerce AJAX Cart Count Fragment ─────────────────────────────────────

add_filter('woocommerce_add_to_cart_fragments', function($fragments) {
    $count = WC()->cart->get_cart_contents_count();
    $fragments['.cart-count'] = '<span class="cart-count">' . $count . '</span>';
    return $fragments;
});

// ─── Security: Remove WordPress version from head ─────────────────────────────

remove_action('wp_head', 'wp_generator');

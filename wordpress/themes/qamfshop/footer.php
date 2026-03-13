<footer class="site-footer">
    <div class="footer-inner">
        <div class="footer-col">
            <div class="site-logo" style="margin-bottom:16px">
                <?php echo qamfshop_logo_svg(); ?>
                <div>
                    <div style="font-size:16px;line-height:1;color:#fff">QAMF</div>
                    <div style="font-size:9px;font-weight:400;color:rgba(255,255,255,.4);letter-spacing:.15em;font-family:var(--font-body)">OFFICIAL MERCH</div>
                </div>
            </div>
            <p style="font-size:13px;line-height:1.6;max-width:280px">
                Official merchandise and marketing solutions from QubicaAMF, the world's largest bowling company.
            </p>
        </div>

        <div class="footer-col">
            <h4>Shop</h4>
            <?php
            wp_nav_menu([
                'theme_location' => 'footer-1',
                'container'      => false,
                'fallback_cb'    => function() {
                    echo '<a href="' . esc_url(wc_get_page_permalink('shop')) . '">All Products</a>';
                    echo '<a href="' . esc_url(wc_get_cart_url()) . '">Cart</a>';
                    echo '<a href="' . esc_url(wc_get_page_permalink('myaccount')) . '">My Account</a>';
                },
            ]);
            ?>
        </div>

        <div class="footer-col">
            <h4>Company</h4>
            <?php
            wp_nav_menu([
                'theme_location' => 'footer-2',
                'container'      => false,
                'fallback_cb'    => function() {
                    echo '<a href="' . esc_url(home_url('/marketing')) . '">Marketing</a>';
                    echo '<a href="https://www.qubicaamf.com" target="_blank" rel="noopener">QubicaAMF.com</a>';
                    echo '<a href="https://www.besxtras.com" target="_blank" rel="noopener">BesXtras Blog</a>';
                },
            ]);
            ?>
        </div>

        <div class="footer-col">
            <h4>Support</h4>
            <?php
            wp_nav_menu([
                'theme_location' => 'footer-3',
                'container'      => false,
                'fallback_cb'    => function() {
                    echo '<a href="mailto:support@qubicaamf.com">Contact Us</a>';
                    echo '<a href="' . esc_url(home_url('/shipping-returns')) . '">Shipping & Returns</a>';
                    echo '<a href="' . esc_url(home_url('/privacy-policy')) . '">Privacy Policy</a>';
                },
            ]);
            ?>
        </div>
    </div>

    <div class="footer-bottom">
        <span>&copy; <?php echo date('Y'); ?> QubicaAMF. All rights reserved.</span>
        <span style="display:flex;gap:8px;align-items:center">
            <span style="font-size:18px">💳</span> Visa &middot; MC &middot; Amex &middot; Discover
        </span>
    </div>
</footer>

<div id="toast" class="toast"></div>

<?php wp_footer(); ?>
</body>
</html>

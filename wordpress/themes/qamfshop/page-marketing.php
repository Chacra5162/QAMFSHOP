<?php
/**
 * Template Name: Marketing Page
 *
 * Bowling center marketing solutions — pricing tiers, features, blog feed.
 * Assign this template to a page called "Marketing" in WordPress.
 */

get_header(); ?>

<style>
/* Marketing page is full-dark theme */
.marketing-page { background: var(--dark); color: #fff; }
.marketing-page .site-header { background: rgba(10,10,11,.95); border-bottom-color: rgba(255,255,255,.06); }
.marketing-page .header-nav a { color: rgba(255,255,255,.5); }
.marketing-page .header-nav a:hover { color: #fff; }
.marketing-page .header-actions button,
.marketing-page .header-actions a { color: rgba(255,255,255,.5); }

.mk-section { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
.mk-hero { text-align: center; padding: 100px 40px 80px; }
.mk-tag {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(232,25,44,.1); border: 1px solid rgba(232,25,44,.2);
    border-radius: 100px; padding: 5px 14px 5px 8px;
    font-size: 11px; font-weight: 700; color: var(--red);
    letter-spacing: .08em; text-transform: uppercase; margin-bottom: 22px;
}
.mk-hero h1 {
    font-family: var(--font-display); font-size: clamp(36px,5vw,56px);
    font-weight: 800; line-height: 1.05; letter-spacing: -.03em; margin-bottom: 20px;
}
.mk-hero h1 span { color: var(--red); }
.mk-hero p { color: rgba(255,255,255,.5); font-size: 16px; max-width: 550px; margin: 0 auto; }

/* Features grid */
.mk-features { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
@media(max-width:768px) { .mk-features { grid-template-columns: 1fr; } }
.mk-feature {
    background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
    border-radius: var(--radius-lg); padding: 32px;
}
.mk-feature-icon { font-size: 32px; margin-bottom: 16px; }
.mk-feature h3 { font-family: var(--font-display); font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.mk-feature p { font-size: 13px; color: rgba(255,255,255,.5); line-height: 1.6; }

/* Pricing */
.mk-pricing { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; align-items: start; }
@media(max-width:768px) { .mk-pricing { grid-template-columns: 1fr; } }
.mk-plan {
    background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
    border-radius: var(--radius-xl); padding: 36px; position: relative;
}
.mk-plan.featured {
    border-color: var(--red); background: rgba(232,25,44,.04);
    box-shadow: 0 0 60px rgba(232,25,44,.1);
}
.mk-plan-badge {
    position: absolute; top: -10px; right: 20px;
    background: var(--red); color: #fff; font-size: 10px; font-weight: 700;
    padding: 4px 12px; border-radius: 100px; letter-spacing: .06em; text-transform: uppercase;
}
.mk-plan h3 { font-family: var(--font-display); font-size: 20px; margin-bottom: 4px; }
.mk-plan .price { font-family: var(--font-display); font-size: 40px; font-weight: 800; margin: 16px 0; }
.mk-plan .price sup { font-size: 16px; color: rgba(255,255,255,.4); }
.mk-plan ul { list-style: none; padding: 0; margin-bottom: 24px; }
.mk-plan li { font-size: 13px; color: rgba(255,255,255,.6); padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
.mk-plan li::before { content: '✓ '; color: var(--green); font-weight: 700; }
.mk-plan-cta {
    display: block; width: 100%; padding: 14px; border-radius: 12px;
    font-weight: 700; font-size: 14px; text-align: center; border: none;
    background: var(--dark); color: #fff; transition: all .2s;
    border: 1.5px solid rgba(255,255,255,.1);
}
.mk-plan.featured .mk-plan-cta { background: var(--red); border-color: var(--red); }
.mk-plan-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
</style>

<div class="marketing-page">

<!-- HERO -->
<section class="mk-hero">
    <div class="mk-tag"><span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--red)"></span> Marketing Solutions</div>
    <h1>Grow Your <span>Bowling Center</span> Brand</h1>
    <p>Premium marketing kits, digital assets, and promotional materials designed specifically for QubicaAMF bowling centers.</p>
</section>

<!-- FEATURES -->
<section class="mk-section">
    <h2 style="font-family:var(--font-display);font-size:28px;text-align:center;margin-bottom:40px">What's Inside</h2>
    <div class="mk-features">
        <div class="mk-feature">
            <div class="mk-feature-icon">📱</div>
            <h3>Social Media Kit</h3>
            <p>Ready-to-post templates for Instagram, Facebook, and TikTok. Customized with your center's branding.</p>
        </div>
        <div class="mk-feature">
            <div class="mk-feature-icon">🎨</div>
            <h3>Print Materials</h3>
            <p>Posters, flyers, table tents, and banners. Professional designs that drive foot traffic.</p>
        </div>
        <div class="mk-feature">
            <div class="mk-feature-icon">📧</div>
            <h3>Email Templates</h3>
            <p>Pre-built email campaigns for leagues, events, birthdays, and promotions.</p>
        </div>
        <div class="mk-feature">
            <div class="mk-feature-icon">📊</div>
            <h3>Digital Signage</h3>
            <p>Animated displays for lobby screens, lane-side monitors, and overhead displays.</p>
        </div>
        <div class="mk-feature">
            <div class="mk-feature-icon">🏆</div>
            <h3>Event Kits</h3>
            <p>Tournament and league promotion packages with scoring graphics and social assets.</p>
        </div>
        <div class="mk-feature">
            <div class="mk-feature-icon">📈</div>
            <h3>Analytics Dashboard</h3>
            <p>Track campaign performance, foot traffic impact, and ROI across all materials.</p>
        </div>
    </div>
</section>

<!-- PRICING -->
<section class="mk-section">
    <h2 style="font-family:var(--font-display);font-size:28px;text-align:center;margin-bottom:12px">Choose Your Plan</h2>
    <p style="text-align:center;color:rgba(255,255,255,.5);margin-bottom:40px">Marketing solutions for centers of every size</p>
    <div class="mk-pricing">
        <div class="mk-plan">
            <h3>Starter</h3>
            <p style="font-size:13px;color:rgba(255,255,255,.4)">For single-lane centers</p>
            <div class="price">$29<sup>/mo</sup></div>
            <ul>
                <li>Social media templates (10/mo)</li>
                <li>1 email campaign template</li>
                <li>Basic digital signage</li>
                <li>QubicaAMF branding kit</li>
            </ul>
            <a href="<?php echo esc_url(home_url('/contact')); ?>" class="mk-plan-cta">Get Started</a>
        </div>
        <div class="mk-plan featured">
            <span class="mk-plan-badge">Most Popular</span>
            <h3>Pro</h3>
            <p style="font-size:13px;color:rgba(255,255,255,.4)">For growing centers</p>
            <div class="price">$59<sup>/mo</sup></div>
            <ul>
                <li>Everything in Starter</li>
                <li>Social media templates (30/mo)</li>
                <li>4 email campaigns/mo</li>
                <li>Full digital signage suite</li>
                <li>Print-ready materials</li>
                <li>Event promotion kits</li>
            </ul>
            <a href="<?php echo esc_url(home_url('/contact')); ?>" class="mk-plan-cta">Get Started</a>
        </div>
        <div class="mk-plan">
            <h3>Center Pack</h3>
            <p style="font-size:13px;color:rgba(255,255,255,.4)">For multi-location operators</p>
            <div class="price">$99<sup>/mo</sup></div>
            <ul>
                <li>Everything in Pro</li>
                <li>Unlimited social templates</li>
                <li>Unlimited email campaigns</li>
                <li>Custom branded materials</li>
                <li>Analytics dashboard</li>
                <li>Dedicated account manager</li>
                <li>Multi-location management</li>
            </ul>
            <a href="<?php echo esc_url(home_url('/contact')); ?>" class="mk-plan-cta">Contact Sales</a>
        </div>
    </div>
</section>

</div>

<?php get_footer();

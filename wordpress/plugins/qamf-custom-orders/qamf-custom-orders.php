<?php
/**
 * Plugin Name: QAMF Custom Order Batch Emailer
 * Description: Collects WooCommerce orders containing custom fulfillment items and emails them to a site admin in a daily batch at 8 AM EST.
 * Version: 1.0.0
 * Author: QubicaAMF
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) exit;

class QAMF_Custom_Orders {

    const OPTION_EMAIL = 'qamf_custom_order_email';
    const OPTION_LAST_BATCH = 'qamf_custom_order_last_batch';
    const CRON_HOOK = 'qamf_daily_custom_order_email';
    const META_KEY = '_qamf_custom_fulfillment';
    const META_BATCHED = '_qamf_custom_batched';

    public function __construct() {
        // Schedule cron on activation
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);

        // Cron action
        add_action(self::CRON_HOOK, [$this, 'send_batch_email']);

        // Tag orders containing custom items when they're placed
        add_action('woocommerce_checkout_order_processed', [$this, 'tag_custom_order'], 10, 1);

        // Admin settings
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);

        // Add custom product meta field in WooCommerce product editor
        add_action('woocommerce_product_options_general_product_data', [$this, 'add_custom_fulfillment_field']);
        add_action('woocommerce_process_product_meta', [$this, 'save_custom_fulfillment_field']);

        // Show badge in admin order list for custom fulfillment orders
        add_filter('manage_edit-shop_order_columns', [$this, 'add_order_column']);
        add_action('manage_shop_order_posts_custom_column', [$this, 'render_order_column'], 10, 2);

        // Ensure cron uses EST timezone
        add_filter('cron_schedules', [$this, 'add_cron_schedule']);
    }

    /**
     * On activation: schedule the daily cron at 8 AM EST.
     */
    public function activate() {
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            // Calculate next 8 AM EST in UTC
            $est = new DateTimeZone('America/New_York');
            $now = new DateTime('now', $est);
            $target = new DateTime('today 08:00', $est);

            // If 8 AM has already passed today, schedule for tomorrow
            if ($now > $target) {
                $target->modify('+1 day');
            }

            $target->setTimezone(new DateTimeZone('UTC'));
            wp_schedule_event($target->getTimestamp(), 'daily', self::CRON_HOOK);
        }

        // Default email to admin email
        if (!get_option(self::OPTION_EMAIL)) {
            update_option(self::OPTION_EMAIL, get_option('admin_email'));
        }
    }

    /**
     * On deactivation: clear the cron.
     */
    public function deactivate() {
        wp_clear_scheduled_hook(self::CRON_HOOK);
    }

    /**
     * Add a custom cron schedule (not needed for daily, but here for clarity).
     */
    public function add_cron_schedule($schedules) {
        return $schedules;
    }

    /**
     * Add "Custom Fulfillment" checkbox to WooCommerce product editor.
     * Products marked as custom fulfillment won't go to Printify —
     * they'll be collected and emailed to the admin instead.
     */
    public function add_custom_fulfillment_field() {
        woocommerce_wp_checkbox([
            'id'          => self::META_KEY,
            'label'       => 'Custom Fulfillment',
            'description' => 'This item is fulfilled manually (not via Printify). Orders will be batched and emailed to the admin daily at 8 AM EST.',
        ]);
    }

    public function save_custom_fulfillment_field($post_id) {
        $value = isset($_POST[self::META_KEY]) ? 'yes' : 'no';
        update_post_meta($post_id, self::META_KEY, $value);
    }

    /**
     * When an order is placed, check if it contains any custom fulfillment products.
     * If so, tag the order with meta so we can query for it later.
     */
    public function tag_custom_order($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;

        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            if (get_post_meta($product_id, self::META_KEY, true) === 'yes') {
                update_post_meta($order_id, self::META_BATCHED, 'pending');
                return; // Only need to tag once
            }
        }
    }

    /**
     * Daily cron: find all orders with custom items that haven't been batched yet,
     * compile them into a formatted email, and send to the admin.
     */
    public function send_batch_email() {
        $recipient = get_option(self::OPTION_EMAIL, get_option('admin_email'));

        // Query orders tagged as pending batch
        $orders = wc_get_orders([
            'meta_key'   => self::META_BATCHED,
            'meta_value' => 'pending',
            'limit'      => -1,
            'orderby'    => 'date',
            'order'      => 'ASC',
        ]);

        if (empty($orders)) {
            update_option(self::OPTION_LAST_BATCH, [
                'time'   => current_time('mysql'),
                'count'  => 0,
                'status' => 'No pending custom orders',
            ]);
            return;
        }

        // Build email
        $subject = sprintf(
            'QAMF Custom Orders — %d order%s for %s',
            count($orders),
            count($orders) > 1 ? 's' : '',
            wp_date('F j, Y')
        );

        $body = $this->build_email_body($orders);

        // Send as HTML email
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        $sent = wp_mail($recipient, $subject, $body, $headers);

        // Mark all as batched
        foreach ($orders as $order) {
            update_post_meta($order->get_id(), self::META_BATCHED, 'sent');
            $order->add_order_note(
                sprintf('Custom fulfillment details emailed to %s in daily batch.', $recipient)
            );
        }

        update_option(self::OPTION_LAST_BATCH, [
            'time'   => current_time('mysql'),
            'count'  => count($orders),
            'status' => $sent ? 'Sent successfully' : 'Send failed',
        ]);
    }

    /**
     * Build a formatted HTML email body with all custom order details.
     */
    private function build_email_body($orders) {
        $html = '<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">';
        $html .= '<div style="background:#0A0A0B;color:#fff;padding:24px 30px;border-radius:12px 12px 0 0">';
        $html .= '<h1 style="margin:0;font-size:22px;color:#E8192C">QAMF Custom Orders</h1>';
        $html .= '<p style="margin:6px 0 0;color:#8E8E93;font-size:14px">' . wp_date('l, F j, Y \a\t g:i A T') . '</p>';
        $html .= '</div>';

        $html .= '<div style="background:#f9f9f9;padding:24px 30px;border:1px solid #e5e5e5;border-top:none">';

        $order_num = 0;
        foreach ($orders as $order) {
            $order_num++;
            $custom_items = [];

            foreach ($order->get_items() as $item) {
                $product_id = $item->get_product_id();
                if (get_post_meta($product_id, self::META_KEY, true) === 'yes') {
                    $custom_items[] = $item;
                }
            }

            if (empty($custom_items)) continue;

            $html .= '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin-bottom:16px">';

            // Order header
            $html .= '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f0f0f0;padding-bottom:12px">';
            $html .= '<div>';
            $html .= '<strong style="font-size:16px">Order #' . $order->get_order_number() . '</strong>';
            $html .= '<span style="color:#8E8E93;font-size:13px;margin-left:10px">' . $order->get_date_created()->date('M j, Y g:i A') . '</span>';
            $html .= '</div>';
            $html .= '<span style="background:#7c3aed;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px">CUSTOM</span>';
            $html .= '</div>';

            // Customer info
            $html .= '<div style="margin-bottom:14px">';
            $html .= '<p style="margin:0 0 4px;font-size:13px;color:#666">CUSTOMER</p>';
            $html .= '<p style="margin:0;font-size:14px"><strong>' . esc_html($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()) . '</strong></p>';
            $html .= '<p style="margin:2px 0;font-size:13px">' . esc_html($order->get_billing_email()) . '</p>';
            if ($order->get_billing_phone()) {
                $html .= '<p style="margin:2px 0;font-size:13px">' . esc_html($order->get_billing_phone()) . '</p>';
            }
            $html .= '</div>';

            // Shipping address
            $html .= '<div style="margin-bottom:14px">';
            $html .= '<p style="margin:0 0 4px;font-size:13px;color:#666">SHIP TO</p>';
            $html .= '<p style="margin:0;font-size:13px;white-space:pre-line">' . esc_html($order->get_formatted_shipping_address()) . '</p>';
            $html .= '</div>';

            // Custom items table
            $html .= '<table style="width:100%;border-collapse:collapse;font-size:13px">';
            $html .= '<tr style="background:#f5f5f5"><th style="text-align:left;padding:8px;border:1px solid #e5e5e5">Item</th><th style="padding:8px;border:1px solid #e5e5e5;width:60px">Qty</th><th style="text-align:right;padding:8px;border:1px solid #e5e5e5;width:80px">Price</th></tr>';

            $custom_total = 0;
            foreach ($custom_items as $item) {
                $subtotal = $item->get_total();
                $custom_total += $subtotal;
                $meta_display = [];
                foreach ($item->get_meta_data() as $meta) {
                    if (substr($meta->key, 0, 1) !== '_') {
                        $meta_display[] = $meta->key . ': ' . $meta->value;
                    }
                }

                $html .= '<tr>';
                $html .= '<td style="padding:8px;border:1px solid #e5e5e5">';
                $html .= '<strong>' . esc_html($item->get_name()) . '</strong>';
                if (!empty($meta_display)) {
                    $html .= '<br><span style="color:#666;font-size:12px">' . esc_html(implode(' · ', $meta_display)) . '</span>';
                }
                $html .= '</td>';
                $html .= '<td style="text-align:center;padding:8px;border:1px solid #e5e5e5">' . $item->get_quantity() . '</td>';
                $html .= '<td style="text-align:right;padding:8px;border:1px solid #e5e5e5">$' . number_format($subtotal, 2) . '</td>';
                $html .= '</tr>';
            }

            $html .= '<tr><td colspan="2" style="text-align:right;padding:8px;border:1px solid #e5e5e5;font-weight:700">Custom Items Total:</td>';
            $html .= '<td style="text-align:right;padding:8px;border:1px solid #e5e5e5;font-weight:700">$' . number_format($custom_total, 2) . '</td></tr>';
            $html .= '</table>';

            // Order notes
            $customer_note = $order->get_customer_note();
            if ($customer_note) {
                $html .= '<div style="margin-top:12px;padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:13px">';
                $html .= '<strong>Customer Note:</strong> ' . esc_html($customer_note);
                $html .= '</div>';
            }

            $html .= '</div>'; // order card
        }

        // Summary footer
        $html .= '<div style="text-align:center;padding:16px;color:#8E8E93;font-size:12px">';
        $html .= count($orders) . ' custom order' . (count($orders) > 1 ? 's' : '') . ' require manual fulfillment.';
        $html .= '<br>View all orders in <a href="' . admin_url('edit.php?post_type=shop_order') . '">WooCommerce &rarr; Orders</a>.';
        $html .= '</div>';

        $html .= '</div></div>';
        return $html;
    }

    /**
     * Admin settings page under WooCommerce menu.
     */
    public function add_settings_page() {
        add_submenu_page(
            'woocommerce',
            'Custom Order Emails',
            'Custom Order Emails',
            'manage_woocommerce',
            'qamf-custom-orders',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('qamf_custom_orders', self::OPTION_EMAIL, [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_email',
        ]);
    }

    public function render_settings_page() {
        $email = get_option(self::OPTION_EMAIL, get_option('admin_email'));
        $last_batch = get_option(self::OPTION_LAST_BATCH, null);
        $next_run = wp_next_scheduled(self::CRON_HOOK);
        ?>
        <div class="wrap">
            <h1>QAMF Custom Order Batch Emails</h1>
            <p>Orders containing custom fulfillment items are collected and emailed to the address below every day at <strong>8:00 AM EST</strong>.</p>

            <form method="post" action="options.php">
                <?php settings_fields('qamf_custom_orders'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="<?php echo self::OPTION_EMAIL; ?>">Recipient Email</label></th>
                        <td>
                            <input type="email" id="<?php echo self::OPTION_EMAIL; ?>" name="<?php echo self::OPTION_EMAIL; ?>" value="<?php echo esc_attr($email); ?>" class="regular-text" />
                            <p class="description">Daily batch emails will be sent to this address.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <h2>Status</h2>
            <table class="widefat" style="max-width:500px">
                <tr>
                    <td><strong>Next scheduled run</strong></td>
                    <td><?php echo $next_run ? wp_date('F j, Y g:i A T', $next_run) : 'Not scheduled'; ?></td>
                </tr>
                <?php if ($last_batch): ?>
                <tr>
                    <td><strong>Last batch sent</strong></td>
                    <td><?php echo esc_html($last_batch['time']); ?></td>
                </tr>
                <tr>
                    <td><strong>Orders in last batch</strong></td>
                    <td><?php echo esc_html($last_batch['count']); ?></td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td><?php echo esc_html($last_batch['status']); ?></td>
                </tr>
                <?php endif; ?>
            </table>

            <h2>Manual Send</h2>
            <p>
                <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=qamf_send_batch_now'), 'qamf_send_batch'); ?>" class="button button-secondary">
                    Send Batch Now
                </a>
                <span class="description">Immediately sends any pending custom orders.</span>
            </p>
        </div>
        <?php
    }

    /**
     * Add "Fulfillment" column to WooCommerce orders list.
     */
    public function add_order_column($columns) {
        $new = [];
        foreach ($columns as $key => $label) {
            $new[$key] = $label;
            if ($key === 'order_status') {
                $new['qamf_fulfillment'] = 'Fulfillment';
            }
        }
        return $new;
    }

    public function render_order_column($column, $post_id) {
        if ($column !== 'qamf_fulfillment') return;

        $status = get_post_meta($post_id, self::META_BATCHED, true);
        if ($status === 'pending') {
            echo '<span style="background:#7c3aed;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">CUSTOM — PENDING</span>';
        } elseif ($status === 'sent') {
            echo '<span style="background:#16a34a;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">CUSTOM — EMAILED</span>';
        } else {
            echo '<span style="color:#8E8E93;font-size:12px">Printify</span>';
        }
    }
}

// Handle manual send action
add_action('admin_post_qamf_send_batch_now', function() {
    if (!current_user_can('manage_woocommerce') || !wp_verify_nonce($_GET['_wpnonce'], 'qamf_send_batch')) {
        wp_die('Unauthorized');
    }
    $plugin = new QAMF_Custom_Orders();
    $plugin->send_batch_email();
    wp_redirect(admin_url('admin.php?page=qamf-custom-orders&batch_sent=1'));
    exit;
});

new QAMF_Custom_Orders();

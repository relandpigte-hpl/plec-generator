<?php
/**
 * Plugin Name: PLEC Preview
 * Description: Device frame preview viewer for uploaded HTML files.
 * Version: 1.0.0
 * Author: Reland Pigte
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Plec_Preview_Plugin {
    private const HANDLE = 'plec-preview-app';
    private const SHORTCODE = 'plec_preview';
    private const DEV_SERVER_DEFAULT = 'http://localhost:5175';
    private const DEV_SERVER_DEBUG = true;
    private const UPLOAD_SUBDIR = 'plec-uploads';
    private const MODULE_HANDLES = [
        'plec-preview-app',
        'plec-preview-app-vite-client',
    ];

    public function __construct() {
        add_shortcode(self::SHORTCODE, [$this, 'render_shortcode']);
        add_filter('script_loader_tag', [$this, 'filter_script_loader_tag'], 10, 3);
        add_action('init', [$this, 'register_rewrite']);
        add_action('template_redirect', [$this, 'render_preview_page']);
    }

    /**
     * Register /preview as a custom rewrite endpoint.
     */
    public function register_rewrite(): void {
        add_rewrite_rule('^preview/?$', 'index.php?plec_preview_page=1', 'top');
        add_filter('query_vars', function (array $vars): array {
            $vars[] = 'plec_preview_page';
            return $vars;
        });
    }

    /**
     * Render a full-page preview (no header/footer) when /preview is hit.
     */
    public function render_preview_page(): void {
        if (!get_query_var('plec_preview_page')) {
            return;
        }

        $this->enqueue_assets();
        add_filter('show_admin_bar', '__return_false');

        // Output bare HTML page — no theme header/footer
        ?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
    <style>html, body { margin: 0 !important; padding: 0 !important; overflow: hidden; height: 100%; background: #f5f4f3 !important; } html { margin-top: 0 !important; } #wpadminbar { display: none !important; }</style>
</head>
<body>
    <div id="plec-preview-root"></div>
    <?php wp_footer(); ?>
</body>
</html><?php
        exit;
    }

    public function render_shortcode(): string {
        if (!$this->can_current_user_use()) {
            return '';
        }

        $this->enqueue_assets();

        return '<div id="plec-preview-root"></div>';
    }

    private function enqueue_assets(): void {
        if ($this->enqueue_dev_assets()) {
            return;
        }

        $this->enqueue_build_assets();
    }

    private function enqueue_dev_assets(): bool {
        if (!self::DEV_SERVER_DEBUG) {
            return false;
        }

        $dev_server = self::DEV_SERVER_DEFAULT;

        $response = wp_remote_get($dev_server . '/@vite/client', [
            'timeout'   => 0.3,
            'sslverify' => false,
        ]);

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return false;
        }

        wp_enqueue_script(self::HANDLE . '-vite-client', $dev_server . '/@vite/client', [], null, true);
        wp_script_add_data(self::HANDLE . '-vite-client', 'type', 'module');

        wp_enqueue_script(self::HANDLE, $dev_server . '/src/main.jsx', [], null, true);
        wp_script_add_data(self::HANDLE, 'type', 'module');
        $this->localize_config();

        return true;
    }

    private function enqueue_build_assets(): void {
        $manifest_path = plugin_dir_path(__FILE__) . 'dist/.vite/manifest.json';

        if (!file_exists($manifest_path)) {
            return;
        }

        $manifest = json_decode((string) file_get_contents($manifest_path), true);

        if (!is_array($manifest) || !isset($manifest['src/main.jsx'])) {
            return;
        }

        $entry = $manifest['src/main.jsx'];

        if (!empty($entry['file'])) {
            wp_enqueue_script(
                self::HANDLE,
                plugin_dir_url(__FILE__) . 'dist/' . $entry['file'],
                [],
                null,
                true
            );
            wp_script_add_data(self::HANDLE, 'type', 'module');
            $this->localize_config();
        }

        if (!empty($entry['css']) && is_array($entry['css'])) {
            foreach ($entry['css'] as $index => $css_file) {
                wp_enqueue_style(
                    self::HANDLE . '-style-' . $index,
                    plugin_dir_url(__FILE__) . 'dist/' . $css_file,
                    [],
                    null
                );
            }
        }
    }

    private function localize_config(): void {
        $upload_dir = wp_upload_dir();

        wp_localize_script(self::HANDLE, 'plecPreviewConfig', [
            'siteUrl'    => home_url(),
            'uploadsUrl' => trailingslashit($upload_dir['baseurl']) . self::UPLOAD_SUBDIR,
            'assetsUrl'  => plugin_dir_url(__FILE__) . 'assets',
        ]);
    }

    public function filter_script_loader_tag(string $tag, string $handle, string $src): string {
        $is_handle = in_array($handle, self::MODULE_HANDLES, true);
        $is_vite   = strpos($src, '/@vite/client') !== false || strpos($src, '/src/main.jsx') !== false;

        if (!$is_handle && !$is_vite) {
            return $tag;
        }

        if (strpos($tag, 'type="module"') !== false || strpos($tag, "type='module'") !== false) {
            return $tag;
        }

        $tag_without_type = (string) preg_replace('/\stype=([\"\']).*?\\1/', '', $tag);

        if (strpos($tag_without_type, '<script') === 0) {
            return (string) preg_replace('/<script\b/', '<script type="module"', $tag_without_type, 1);
        }

        return sprintf('<script type="module" src="%s"></script>', esc_url($src));
    }

    private function can_current_user_use(): bool {
        if (!is_user_logged_in()) {
            return false;
        }

        $user = wp_get_current_user();
        if (!$user instanceof WP_User) {
            return false;
        }

        return in_array('administrator', $user->roles, true)
            || in_array('subscriber', $user->roles, true);
    }
}

new Plec_Preview_Plugin();

// Flush rewrite rules on activation so /preview endpoint works immediately.
register_activation_hook(__FILE__, function (): void {
    (new Plec_Preview_Plugin())->register_rewrite();
    flush_rewrite_rules();
});

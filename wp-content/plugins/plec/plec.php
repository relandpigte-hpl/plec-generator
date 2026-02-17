<?php
/**
 * Plugin Name: PLEC
 * Description: WordPress plugin powered by React + Vite.
 * Version: 1.1.0
 * Author: Reland Pigte
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Plec_Plugin {
    private const HANDLE = 'plec-app';
    private const SHORTCODE = 'plec';
    private const DEV_SERVER_DEFAULT = 'http://localhost:5173';
    private const DEV_SERVER_DEBUG = true;
    private const MODULE_HANDLES = [
        'plec-app',
        'plec-app-vite-client',
    ];

    public function __construct() {
        add_shortcode(self::SHORTCODE, [$this, 'render_shortcode']);
        add_filter('script_loader_tag', [$this, 'filter_script_loader_tag'], 10, 3);
    }

    public function render_shortcode(): string {
        $this->enqueue_assets();

        return '<div id="plec-root"></div>';
    }

    private function enqueue_assets(): void {
        if ($this->enqueue_dev_assets()) {
            return;
        }

        $this->enqueue_build_assets();
    }

    private function enqueue_dev_assets(): bool {
        if (!$this->is_dev_mode_enabled()) {
            return false;
        }

        $dev_server = $this->get_dev_server_url();

        if (!$this->is_dev_server_running($dev_server)) {
            return false;
        }

        wp_enqueue_script(self::HANDLE . '-vite-client', $dev_server . '/@vite/client', [], null, true);
        wp_script_add_data(self::HANDLE . '-vite-client', 'type', 'module');

        wp_enqueue_script(self::HANDLE, $dev_server . '/src/main.jsx', [], null, true);
        wp_script_add_data(self::HANDLE, 'type', 'module');

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

    private function is_dev_mode_enabled(): bool {
        return self::DEV_SERVER_DEBUG;
    }

    private function get_dev_server_url(): string {
        return self::DEV_SERVER_DEFAULT;
    }

    private function is_dev_server_running(string $dev_server): bool {
        $response = wp_remote_get($dev_server . '/@vite/client', [
            'timeout' => 0.3,
            'sslverify' => false,
        ]);

        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
    }

    public function filter_script_loader_tag(string $tag, string $handle, string $src): string {
        $is_plec_handle = in_array($handle, self::MODULE_HANDLES, true);
        $is_vite_dev_src = strpos($src, '/@vite/client') !== false || strpos($src, '/src/main.jsx') !== false;

        if (!$is_plec_handle && !$is_vite_dev_src) {
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
}

new Plec_Plugin();

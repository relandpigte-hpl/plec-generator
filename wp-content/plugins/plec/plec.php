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
    private const ZIP_RETENTION_SECONDS = HOUR_IN_SECONDS;
    private const MODULE_HANDLES = [
        'plec-app',
        'plec-app-vite-client',
    ];

    public function __construct() {
        add_shortcode(self::SHORTCODE, [$this, 'render_shortcode']);
        add_filter('script_loader_tag', [$this, 'filter_script_loader_tag'], 10, 3);
        add_action('wp_ajax_plec_generate_zip', [$this, 'handle_generate_zip']);
    }

    public function render_shortcode(): string {
        if (!$this->can_current_user_use_generator()) {
            return '';
        }

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
        $this->localize_app_config();

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
            $this->localize_app_config();
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

    private function localize_app_config(): void {
        $max_file_uploads = (int) ini_get('max_file_uploads');
        if ($max_file_uploads <= 0) {
            $max_file_uploads = 20;
        }

        wp_localize_script(self::HANDLE, 'plecAppConfig', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('plec_generate_zip'),
            'maxFileUploads' => $max_file_uploads,
        ]);
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

    public function handle_generate_zip(): void {
        if (!$this->can_current_user_use_generator()) {
            wp_send_json_error(['message' => 'Unauthorized'], 403);
        }

        $nonce = isset($_POST['nonce']) ? sanitize_text_field((string) wp_unslash($_POST['nonce'])) : '';
        if (!wp_verify_nonce($nonce, 'plec_generate_zip')) {
            wp_send_json_error(['message' => 'Invalid request nonce. Refresh the page and try again.'], 403);
        }

        $rows = json_decode((string) wp_unslash($_POST['rows'] ?? ''), true);
        if (!is_array($rows) || empty($rows)) {
            wp_send_json_error(['message' => 'No rows were provided.'], 400);
        }

        $template_path = plugin_dir_path(__FILE__) . 'src/templates/sip-template.html';
        if (!file_exists($template_path)) {
            wp_send_json_error(['message' => 'Template file not found.'], 500);
        }

        $template = (string) file_get_contents($template_path);
        if ($template === '') {
            wp_send_json_error(['message' => 'Template file is empty.'], 500);
        }

        $uploads = wp_upload_dir();
        if (!empty($uploads['error'])) {
            wp_send_json_error(['message' => $uploads['error']], 500);
        }

        $base_dir = trailingslashit($uploads['basedir']) . 'plec-generated';
        $base_url = trailingslashit($uploads['baseurl']) . 'plec-generated';

        if (!wp_mkdir_p($base_dir)) {
            wp_send_json_error(['message' => 'Unable to prepare output directory.'], 500);
        }

        $this->cleanup_old_zip_archives($base_dir);

        $job_prefix = $this->build_job_prefix_from_rows($rows);
        $job_id = $job_prefix . '-' . gmdate('Ymd-His') . '-' . wp_generate_password(6, false, false);
        $job_dir = trailingslashit($base_dir) . $job_id;

        if (!wp_mkdir_p($job_dir)) {
            wp_send_json_error(['message' => 'Unable to create output directory.'], 500);
        }

        if (!class_exists('ZipArchive')) {
            wp_send_json_error(['message' => 'ZipArchive is not available on this server.'], 500);
        }

        $generated_files = [];
        $used_filenames = [];

        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }

            $portrait_field = sanitize_key((string) ($row['portraitField'] ?? ''));
            $landscape_field = sanitize_key((string) ($row['landscapeField'] ?? ''));
            $requested_filename = (string) ($row['filename'] ?? '');
            $filename = $this->build_output_filename($requested_filename, (int) $index + 1, $used_filenames);

            if ($portrait_field === '' || $landscape_field === '') {
                wp_send_json_error(['message' => 'Missing portrait/landscape field mapping.'], 400);
            }

            $portrait_tmp = $_FILES[$portrait_field]['tmp_name'] ?? '';
            $landscape_tmp = $_FILES[$landscape_field]['tmp_name'] ?? '';

            if (!is_string($portrait_tmp) || $portrait_tmp === '' || !is_uploaded_file($portrait_tmp)) {
                wp_send_json_error(['message' => "Missing portrait file for {$filename}."], 400);
            }

            if (!is_string($landscape_tmp) || $landscape_tmp === '' || !is_uploaded_file($landscape_tmp)) {
                wp_send_json_error(['message' => "Missing landscape file for {$filename}."], 400);
            }

            $src_portrait = $this->build_data_uri_from_upload($portrait_tmp);
            $src_landscape = $this->build_data_uri_from_upload($landscape_tmp);

            if ($src_portrait === '' || $src_landscape === '') {
                wp_send_json_error(['message' => "Failed to process media for {$filename}."], 500);
            }

            $html = str_replace(
                ['{srcPortrait}', '{srcLandscape}'],
                [$src_portrait, $src_landscape],
                $template
            );

            $file_path = trailingslashit($job_dir) . $filename;
            $write_result = file_put_contents($file_path, $html);

            if ($write_result === false) {
                wp_send_json_error(['message' => "Could not write {$filename}."], 500);
            }

            $generated_files[] = [
                'path' => $file_path,
                'name' => $filename,
            ];
        }

        if (empty($generated_files)) {
            wp_send_json_error(['message' => 'No valid rows were generated.'], 400);
        }

        $zip_path = trailingslashit($base_dir) . "{$job_id}.zip";
        $zip = new ZipArchive();
        $open_result = $zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        if ($open_result !== true) {
            wp_send_json_error(['message' => 'Unable to create zip file.'], 500);
        }

        foreach ($generated_files as $generated_file) {
            $zip->addFile($generated_file['path'], $generated_file['name']);
        }

        $zip->close();

        wp_send_json_success([
            'downloadUrl' => trailingslashit($base_url) . "{$job_id}.zip",
            'fileCount' => count($generated_files),
        ]);
    }

    private function build_output_filename(string $requested_filename, int $index, array &$used_filenames): string {
        $filename = sanitize_file_name(trim($requested_filename));

        if ($filename === '') {
            $filename = "sip-{$index}.html";
        }

        if (!preg_match('/\.html?$/i', $filename)) {
            $filename .= '.html';
        }

        $original_filename = $filename;
        $suffix = 1;

        while (in_array(strtolower($filename), $used_filenames, true)) {
            $filename = preg_replace('/\.html?$/i', '', $original_filename) . "-{$suffix}.html";
            $suffix++;
        }

        $used_filenames[] = strtolower($filename);

        return $filename;
    }

    private function build_data_uri_from_upload(string $tmp_file): string {
        $content = file_get_contents($tmp_file);
        if ($content === false) {
            return '';
        }

        $mime = function_exists('mime_content_type') ? mime_content_type($tmp_file) : '';
        if (!is_string($mime) || strpos($mime, '/') === false) {
            $mime = 'application/octet-stream';
        }

        return 'data:' . $mime . ';base64,' . base64_encode($content);
    }

    private function cleanup_old_zip_archives(string $base_dir): void {
        $zip_files = glob(trailingslashit($base_dir) . '*.zip');

        if (!is_array($zip_files)) {
            return;
        }

        $threshold = time() - self::ZIP_RETENTION_SECONDS;

        foreach ($zip_files as $zip_file) {
            if (!is_string($zip_file) || !is_file($zip_file)) {
                continue;
            }

            $file_time = filemtime($zip_file);
            if ($file_time !== false && $file_time < $threshold) {
                @unlink($zip_file);
            }
        }
    }

    private function build_job_prefix_from_rows(array $rows): string {
        $network_prefix = 'network';
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $raw_network = trim((string) ($row['adNetwork'] ?? ''));
            $sanitized_network = sanitize_file_name($raw_network);

            if ($sanitized_network !== '') {
                $network_prefix = $sanitized_network;
                break;
            }
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $raw_filename = trim((string) ($row['filename'] ?? ''));
            if ($raw_filename === '') {
                continue;
            }

            $name_without_ext = preg_replace('/\.html?$/i', '', $raw_filename);
            $name_without_suffix = preg_replace('/_\d{2}$/', '', (string) $name_without_ext);
            $sanitized = sanitize_file_name((string) $name_without_suffix);

            if ($sanitized !== '') {
                return "{$network_prefix}-{$sanitized}";
            }
        }

        return "{$network_prefix}-sip";
    }

    private function can_current_user_use_generator(): bool {
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

new Plec_Plugin();

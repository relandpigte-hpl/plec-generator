<?php

if (is_file(__DIR__ . '/vendor/autoload_packages.php')) {
    require_once __DIR__ . '/vendor/autoload_packages.php';
}

function tailpress(): TailPress\Framework\Theme
{
    return TailPress\Framework\Theme::instance()
        ->assets(
            fn($manager) => $manager
                ->withCompiler(
                    new TailPress\Framework\Assets\ViteCompiler,
                    fn($compiler) => $compiler
                        ->registerAsset('resources/css/app.css')
                        ->registerAsset('resources/js/app.js')
                        ->editorStyleFile('resources/css/editor-style.css')
                )
                ->enqueueAssets()
        )
        ->features(fn($manager) => $manager->add(TailPress\Framework\Features\MenuOptions::class))
        ->menus(fn($manager) => $manager->add('primary', __('Primary Menu', 'tailpress')))
        ->themeSupport(fn($manager) => $manager->add([
            'title-tag',
            'custom-logo',
            'post-thumbnails',
            'align-wide',
            'wp-block-styles',
            'responsive-embeds',
            'html5' => [
                'search-form',
                'comment-form',
                'comment-list',
                'gallery',
                'caption',
            ]
        ]));
}

tailpress();

function plec_redirect_if_not_logged_in()
{
    if (!is_user_logged_in() && !is_admin() && !is_page('login') && !get_query_var('plec_preview_page')) {
        wp_redirect(wp_login_url());
        exit;
    }
}
add_action('template_redirect', 'plec_redirect_if_not_logged_in');

function plec_role_based_login_redirect($redirect_to, $request, $user)
{

    if (isset($user->roles) && is_array($user->roles)) {

        if (in_array('subscriber', $user->roles)) {
            return home_url();
        }

        if (in_array('administrator', $user->roles)) {
            return admin_url();
        }
    }

    return $redirect_to;
}

add_filter('login_redirect', 'plec_role_based_login_redirect', 10, 3);

/**
 * Auto-create required pages and ensure primary menu has all entries.
 */
function plec_setup_pages_and_menu(): void {
    // Pages that should exist with their shortcodes.
    $pages = [
        'sip-generator' => ['title' => 'SIP Generator', 'content' => '[plec]'],
        'file-upload'   => ['title' => 'File Upload',   'content' => '[plec_upload]'],
    ];

    $page_ids = [];

    foreach ($pages as $slug => $page) {
        $existing = get_page_by_path($slug);
        if ($existing) {
            $page_ids[$slug] = $existing->ID;
            continue;
        }

        $id = wp_insert_post([
            'post_title'   => $page['title'],
            'post_name'    => $slug,
            'post_content' => '<!-- wp:paragraph --><p>' . $page['content'] . '</p><!-- /wp:paragraph -->',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => 1,
        ]);

        if (!is_wp_error($id)) {
            $page_ids[$slug] = $id;
        }
    }

    // Ensure a primary nav menu exists and contains all pages.
    $locations = get_nav_menu_locations();
    $menu_id   = !empty($locations['primary']) ? (int) $locations['primary'] : 0;

    if (!$menu_id) {
        $menu_id = wp_create_nav_menu('Primary');
        if (is_wp_error($menu_id)) {
            // Menu with this name may already exist — find it.
            $existing_menu = wp_get_nav_menu_object('Primary');
            if ($existing_menu) {
                $menu_id = $existing_menu->term_id;
            } else {
                return;
            }
        }
        set_theme_mod('nav_menu_locations', ['primary' => $menu_id]);
    }

    // Get existing menu item page IDs so we don't add duplicates.
    $existing_items  = wp_get_nav_menu_items($menu_id);
    $existing_obj_ids = [];
    if (is_array($existing_items)) {
        foreach ($existing_items as $item) {
            if ($item->type === 'post_type' && $item->object === 'page') {
                $existing_obj_ids[] = (int) $item->object_id;
            }
        }
    }

    $position = count($existing_obj_ids) + 1;

    foreach ($page_ids as $slug => $pid) {
        if (in_array($pid, $existing_obj_ids, true)) {
            continue;
        }

        wp_update_nav_menu_item($menu_id, 0, [
            'menu-item-title'     => $pages[$slug]['title'],
            'menu-item-object'    => 'page',
            'menu-item-object-id' => $pid,
            'menu-item-type'      => 'post_type',
            'menu-item-status'    => 'publish',
            'menu-item-position'  => $position++,
        ]);
    }
}
add_action('after_setup_theme', 'plec_setup_pages_and_menu');

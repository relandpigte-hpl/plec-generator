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
    if (!is_user_logged_in() && !is_admin() && !is_page('login')) {
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

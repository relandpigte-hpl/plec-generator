<?php
/**
 * Theme header template.
 *
 * @package TailPress
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <link rel="pingback" href="<?php bloginfo('pingback_url'); ?>">
    <?php wp_head(); ?>
</head>
<body <?php body_class('bg-white text-zinc-900 antialiased'); ?>>
<?php do_action('tailpress_site_before'); ?>

<div id="page" class="min-h-screen flex flex-col">
    <?php do_action('tailpress_header'); ?>

    <header class="site-header">
        <div class="site-header__inner">
            <div class="site-header__brand">
                <?php if (has_custom_logo()): ?>
                    <?php the_custom_logo(); ?>
                <?php else: ?>
                    <a href="<?php echo esc_url(home_url('/')); ?>" class="site-header__title">
                        <?php bloginfo('name'); ?>
                    </a>
                    <?php if ($description = get_bloginfo('description')): ?>
                        <span class="site-header__sep">|</span>
                        <span class="site-header__desc"><?php echo esc_html($description); ?></span>
                    <?php endif; ?>
                <?php endif; ?>
            </div>

            <button type="button" aria-label="Toggle navigation" id="primary-menu-toggle" class="site-header__toggle">
                <svg class="hamburger-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <svg class="close-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24" style="display:none">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <nav id="primary-navigation" class="site-header__nav">
                <?php
                wp_nav_menu([
                    'container_id'    => 'primary-menu',
                    'container_class' => '',
                    'menu_class'      => 'site-header__menu',
                    'theme_location'  => 'primary',
                    'li_class'        => 'site-header__menu-item',
                    'fallback_cb'     => 'wp_page_menu',
                ]);
                ?>
            </nav>
        </div>
    </header>

    <div id="content" class="site-content grow">
        <?php do_action('tailpress_content_start'); ?>
        <main>

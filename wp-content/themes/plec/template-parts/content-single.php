<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <?php
    // Hide the page title on pages that contain plec shortcodes.
    $plec_page = is_page() && (
        has_shortcode(get_the_content(), 'plec') ||
        has_shortcode(get_the_content(), 'plec_upload')
    );
    ?>
    <?php if (!$plec_page): ?>
        <header class="mx-auto flex max-w-5xl flex-col text-center">
            <h1 class="mt-6 text-3xl font-medium tracking-tight text-balance text-zinc-950"><?php the_title(); ?></h1>

            <?php if(! is_page()): ?>
                <time datetime="<?php echo get_the_date( 'c' ); ?>" itemprop="datePublished" class="order-first text-sm text-zinc-950"><?php echo get_the_date(); ?></time>

                <p class="mt-6 text-sm font-semibold text-zinc-950">by <?php the_author(); ?></p>
            <?php endif; ?>
        </header>

        <?php if(has_post_thumbnail()): ?>
            <div class="mt-10 sm:mt-20 mx-auto max-w-4xl rounded-4xl bg-light overflow-hidden">
                <?php the_post_thumbnail('large', ['class' => 'aspect-16/10 w-full object-cover']); ?>
            </div>
        <?php endif; ?>
    <?php endif; ?>

    <div class="entry-content mx-auto <?php echo $plec_page ? 'mt-0' : 'mt-4 sm:mt-8'; ?>">
        <?php the_content(); ?>
    </div>
</article>

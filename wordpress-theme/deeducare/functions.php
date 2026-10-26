<?php
/**
 * DE Educare theme bootstrap.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

define( 'DE_THEME_VERSION', '2.2.1' );
define( 'DE_THEME_DIR', get_template_directory() );
define( 'DE_THEME_URI', get_template_directory_uri() );

// First: serves a cached page (if any) before the rest of the theme loads.
require DE_THEME_DIR . '/inc/perf.php';
require DE_THEME_DIR . '/inc/content.php';
require DE_THEME_DIR . '/inc/helpers.php';
require DE_THEME_DIR . '/inc/customizer.php';
require DE_THEME_DIR . '/inc/exam-render.php';
require DE_THEME_DIR . '/inc/blocks.php';
require DE_THEME_DIR . '/inc/page-builder-blocks.php';
require DE_THEME_DIR . '/inc/page-builder.php';
require DE_THEME_DIR . '/inc/seo.php';
require DE_THEME_DIR . '/inc/contact.php';
require DE_THEME_DIR . '/inc/lead.php';
require DE_THEME_DIR . '/inc/reviews.php';
require DE_THEME_DIR . '/inc/predict.php';
require DE_THEME_DIR . '/inc/setup.php';

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'custom-logo', array( 'height' => 80, 'width' => 80, 'flex-width' => true ) );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( 'assets/fonts/fonts.css', 'assets/css/site.css' ) );
} );

/**
 * Fonts: Manrope 400–800 and IBM Plex Mono 500/600, served from the theme (assets/fonts) so pages
 * don't wait on Google's servers. The main Manrope file is preloaded.
 */
add_action( 'wp_head', function () {
	printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( DE_THEME_URI . '/assets/fonts/manrope-latin.woff2' ) );
	if ( de_setting( 'portal_url' ) ) {
		printf( '<link rel="preconnect" href="%s" crossorigin>' . "\n", esc_url( untrailingslashit( de_setting( 'portal_url' ) ) ) );
	}
}, 1 );

add_action( 'wp_enqueue_scripts', function () {
	// The @font-face rules are small, so they go inline in the head instead of a separate request.
	$fonts = (string) file_get_contents( DE_THEME_DIR . '/assets/fonts/fonts.css' );
	wp_register_style( 'deeducare-fonts', false, array(), DE_THEME_VERSION );
	wp_enqueue_style( 'deeducare-fonts' );
	wp_add_inline_style( 'deeducare-fonts', str_replace( "url('", "url('" . DE_THEME_URI . '/assets/fonts/', $fonts ) );
	wp_enqueue_style( 'deeducare', DE_THEME_URI . '/assets/css/site.css', array( 'deeducare-fonts' ), DE_THEME_VERSION );
	wp_enqueue_script( 'deeducare', DE_THEME_URI . '/assets/js/site.js', array(), DE_THEME_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
	wp_localize_script( 'deeducare', 'DE_SITE', array(
		'leadUrl'  => esc_url_raw( rest_url( 'deeducare/v1/lead' ) ),
		'examDate' => de_setting( 'cat_date' ),
		'portal'   => untrailingslashit( de_portal() ),
		'signup'   => de_signup_url(),
		'login'    => de_login_url(),
	) );
	// Guru on every page: talks to the portal, so signed-in students keep one history and one coin balance.
	wp_enqueue_script( 'deeducare-guru', DE_THEME_URI . '/assets/js/guru.js', array( 'deeducare' ), DE_THEME_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
} );

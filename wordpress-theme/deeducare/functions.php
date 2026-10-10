<?php
/**
 * DE Educare theme bootstrap.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

define( 'DE_THEME_VERSION', '1.1.0' );
define( 'DE_THEME_DIR', get_template_directory() );
define( 'DE_THEME_URI', get_template_directory_uri() );

require DE_THEME_DIR . '/inc/content.php';
require DE_THEME_DIR . '/inc/helpers.php';
require DE_THEME_DIR . '/inc/customizer.php';
require DE_THEME_DIR . '/inc/exam-render.php';
require DE_THEME_DIR . '/inc/blocks.php';
require DE_THEME_DIR . '/inc/seo.php';
require DE_THEME_DIR . '/inc/guru.php';
require DE_THEME_DIR . '/inc/contact.php';
require DE_THEME_DIR . '/inc/setup.php';

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'custom-logo', array( 'height' => 80, 'width' => 80, 'flex-width' => true ) );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( de_fonts_url(), 'assets/css/site.css' ) );
} );

/**
 * Google Fonts: Manrope 400–800 and IBM Plex Mono 500/600, as in the design.
 */
function de_fonts_url() {
	return 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap';
}

add_action( 'wp_head', function () {
	echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
}, 1 );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'deeducare-fonts', de_fonts_url(), array(), null );
	wp_enqueue_style( 'deeducare', DE_THEME_URI . '/assets/css/site.css', array( 'deeducare-fonts' ), DE_THEME_VERSION );
	wp_enqueue_script( 'deeducare', DE_THEME_URI . '/assets/js/site.js', array(), DE_THEME_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
	wp_localize_script( 'deeducare', 'DE_SITE', array(
		'guruUrl'   => esc_url_raw( rest_url( 'deeducare/v1/guru' ) ),
		'examDate'  => de_setting( 'cat_date' ),
		'fallback'  => DE_GURU_FALLBACK,
		'portal'    => untrailingslashit( de_portal() ),
	) );
} );

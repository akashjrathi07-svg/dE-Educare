<?php
/**
 * On theme activation, create the five pages the design needs (if missing).
 * Each slug has its own template (templates/page-{slug}.html), so the page
 * body comes from the theme and existing page content is not changed.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

function de_required_pages() {
	return array(
		'cat'            => 'CAT Mock Tests & Test Series',
		'mba-cet'        => 'MBA-CET Mock Tests & Test Series',
		'omet'           => 'OMETs: SNAP, NMAT, XAT, CMAT',
		'free-resources' => 'Free resources',
		'contact'        => 'Contact',
	);
}

add_action( 'after_switch_theme', function () {
	foreach ( de_required_pages() as $slug => $title ) {
		if ( get_page_by_path( $slug, OBJECT, 'page' ) ) {
			continue;
		}
		wp_insert_post( array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_name'    => $slug,
			'post_title'   => $title,
			'post_content' => '',
		) );
	}
	flush_rewrite_rules();
} );

/** Admin notice listing any of the five pages that are still missing. */
add_action( 'admin_notices', function () {
	if ( ! current_user_can( 'edit_pages' ) ) {
		return;
	}
	$missing = array();
	foreach ( de_required_pages() as $slug => $title ) {
		if ( ! get_page_by_path( $slug, OBJECT, 'page' ) ) {
			$missing[] = '/' . $slug . '/';
		}
	}
	if ( $missing ) {
		printf( '<div class="notice notice-warning"><p>%s</p></div>', esc_html( 'DE Educare theme: create pages with these slugs so their designed layout appears: ' . implode( ', ', $missing ) ) );
	}
} );

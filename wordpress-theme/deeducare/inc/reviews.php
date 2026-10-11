<?php
/**
 * Content fed by the portal: student reviews and free resources.
 *
 * Student reviews. Students write them in the portal (Profile → Write a
 * review), staff approve them in Admin → Reviews, and approved ones show
 * here. Nothing is shown until real reviews exist.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/**
 * Approved reviews from the portal (refreshed every 10 minutes, see de_portal_data).
 * Each: id, name, exam, kind (tests|classes|guru), rating, text, photo, date.
 */
function de_reviews() {
	return de_portal_data( 'reviews', 'api/public/reviews', function ( $data ) {
		$list = array();
		foreach ( ( $data['reviews'] ?? array() ) as $r ) {
			if ( ! empty( $r['text'] ) && ! empty( $r['name'] ) ) {
				$list[] = $r;
			}
		}
		return $list;
	} );
}

function de_review_kinds() {
	return array( 'tests' => 'Test series', 'classes' => 'Classes', 'guru' => 'Guru AI' );
}

/**
 * Free notes and PDFs from the portal (Admin → Free resources).
 * Each: title, exam, kind, pages, desc, url (portal viewer; sign-in required, view only).
 */
function de_free_resources() {
	return de_portal_data( 'resources', 'api/public/resources', function ( $data ) {
		$list = array();
		foreach ( ( $data['resources'] ?? array() ) as $r ) {
			if ( ! empty( $r['title'] ) && ! empty( $r['url'] ) ) {
				$list[] = $r;
			}
		}
		return $list;
	} );
}

/**
 * Free tests marked "Free" and live in the portal (Admin → Tests), grouped by
 * exam code (CAT, MBA-CET, SNAP…).
 * Each: slug, name, questions, minutes.
 */
function de_portal_free_tests() {
	return de_portal_data( 'free_tests', 'api/public/free-tests', function ( $data ) {
		$out = array();
		foreach ( ( $data['tests'] ?? array() ) as $t ) {
			if ( ! empty( $t['slug'] ) && ! empty( $t['exam'] ) ) {
				$out[ $t['exam'] ][] = $t;
			}
		}
		return $out;
	} );
}

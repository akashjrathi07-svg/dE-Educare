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
 * Each: slug, name, type, questions, minutes.
 */
function de_portal_free_tests() {
	return de_portal_data( 'free_tests', 'api/public/free-tests', function ( $data ) {
		$out = array();
		foreach ( ( $data['tests'] ?? array() ) as $t ) {
			if ( ! empty( $t['slug'] ) && ! empty( $t['exam'] ) ) {
				$out[ $t['exam'] ][] = $t;
			}
		}
		// Exams whose daily test can be made (they have live questions).
		$out['_daily'] = $data['daily'] ?? null;
		return $out;
	} );
}

/** Free tests of one exam, optionally of one type: de_free_tests( 'CAT', 'full_mock' ). */
function de_free_tests( $code, $type = '' ) {
	$all = de_portal_free_tests()[ $code ] ?? array();
	return $type ? array_values( array_filter( $all, function ( $t ) use ( $type ) { return ( $t['type'] ?? '' ) === $type; } ) ) : $all;
}

/** Whether this exam has a daily test (until the portal says, CAT and SNAP do). */
function de_has_daily( $code ) {
	$d = de_portal_free_tests()['_daily'] ?? null;
	return in_array( $code, is_array( $d ) ? $d : array( 'CAT', 'SNAP' ), true );
}

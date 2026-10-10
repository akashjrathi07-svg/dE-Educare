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
 * Approved reviews from the portal, cached for 10 minutes.
 * Each: id, name, exam, kind (tests|classes|guru), rating, text, photo, date.
 */
function de_reviews() {
	$cached = get_transient( 'de_reviews' );
	if ( false !== $cached ) {
		return $cached;
	}
	$res  = wp_remote_get( de_portal( 'api/public/reviews' ), array( 'timeout' => 3 ) );
	$list = array();
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		foreach ( ( $data['reviews'] ?? array() ) as $r ) {
			if ( ! empty( $r['text'] ) && ! empty( $r['name'] ) ) {
				$list[] = $r;
			}
		}
	}
	set_transient( 'de_reviews', $list, $list ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $list;
}

function de_review_kinds() {
	return array( 'tests' => 'Test series', 'classes' => 'Classes', 'guru' => 'Guru AI' );
}

/**
 * Free notes and PDFs from the portal (Admin → Free resources), cached for 10 minutes.
 * Each: title, exam, kind, pages, desc, url (portal viewer; sign-in required, view only).
 */
function de_free_resources() {
	$cached = get_transient( 'de_free_resources' );
	if ( false !== $cached ) {
		return $cached;
	}
	$res  = wp_remote_get( de_portal( 'api/public/resources' ), array( 'timeout' => 3 ) );
	$list = array();
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		foreach ( ( $data['resources'] ?? array() ) as $r ) {
			if ( ! empty( $r['title'] ) && ! empty( $r['url'] ) ) {
				$list[] = $r;
			}
		}
	}
	set_transient( 'de_free_resources', $list, $list ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $list;
}

/**
 * Free tests marked "Free" and live in the portal (Admin → Tests), grouped by
 * exam code (CAT, MBA-CET, SNAP…), cached for 10 minutes.
 * Each: slug, name, questions, minutes.
 */
function de_portal_free_tests() {
	$cached = get_transient( 'de_free_tests' );
	if ( false !== $cached ) {
		return $cached;
	}
	$res = wp_remote_get( de_portal( 'api/public/free-tests' ), array( 'timeout' => 3 ) );
	$out = array();
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		foreach ( ( $data['tests'] ?? array() ) as $t ) {
			if ( ! empty( $t['slug'] ) && ! empty( $t['exam'] ) ) {
				$out[ $t['exam'] ][] = $t;
			}
		}
	}
	set_transient( 'de_free_tests', $out, $out ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $out;
}

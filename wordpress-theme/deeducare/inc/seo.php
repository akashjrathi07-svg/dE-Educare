<?php
/**
 * Per-page title, meta description, canonical, Open Graph and JSON-LD
 * (EducationalOrganization, Course + Offer, FAQPage, BreadcrumbList).
 *
 * If an SEO plugin (Rank Math, Yoast, All in One SEO) is active, the theme
 * leaves titles, descriptions, canonical and Open Graph to the plugin and
 * only adds the Course, FAQ and breadcrumb structured data. Turn off the
 * plugin's own FAQ schema for these pages to avoid duplicates.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

function de_seo_plugin_active() {
	return defined( 'RANK_MATH_VERSION' ) || defined( 'WPSEO_VERSION' ) || defined( 'AIOSEO_VERSION' );
}

/** Title and description per page. */
function de_seo_meta() {
	return array(
		'home'    => array( 'DE Educare · CAT, MBA-CET and OMET mock tests with AI analysis', 'CAT mocks, MBA-CET and OMET test series, sectional and topic tests with AI analysis by Guru. Free daily test, previous papers and percentile predictor.' ),
		'cat'     => array( 'CAT Mock Tests & CAT Test Series 2026 with AI analysis · DE Educare', '20 full CAT mocks, 30 sectionals and 3 topic tests for every topic, with All-India percentile and AI analysis. CAT 2026 pattern, syllabus, dates and cutoffs. Free daily test.' ),
		'cet'     => array( 'MBA-CET Mock Tests & Test Series 2027 · DE Educare', 'MAH MBA-CET mocks, sectionals and topic tests built for speed: 200 questions in 150 minutes, no negative marking. Pattern, syllabus, dates, cutoffs and a free daily test.' ),
		'omet'    => array( 'SNAP, NMAT, XAT & CMAT Mock Tests · DE Educare OMETs', 'Exam-specific mocks for SNAP, NMAT, XAT and CMAT, each with its own pattern, timing and marking, plus AI analysis. Patterns, dates, colleges and preparation tips.' ),
		'free'    => array( 'Free CAT Questions, Daily Test & Percentile Predictor · DE Educare', 'Free CAT practice questions with worked solutions, a daily free test, previous papers as mocks and a CAT percentile predictor. AI analysis on every attempt.' ),
		'contact' => array( 'Contact DE Educare · Book a free counselling call', 'Talk to the DE Educare team in Mumbai about CAT, MBA-CET, OMET and upcoming government exam test series. Request a call back or WhatsApp us.' ),
	);
}

add_filter( 'pre_get_document_title', function ( $title ) {
	$key = de_page_key();
	if ( ! $key || de_seo_plugin_active() ) {
		return $title;
	}
	return de_seo_meta()[ $key ][0];
} );

add_action( 'wp_head', function () {
	$key = de_page_key();
	if ( ! $key ) {
		return;
	}
	$meta = de_seo_meta()[ $key ];
	$url  = 'home' === $key ? home_url( '/' ) : get_permalink( get_queried_object_id() );

	if ( ! de_seo_plugin_active() ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $meta[1] ) );
		printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $url ) );
		printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( $meta[0] ) );
		printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $meta[1] ) );
		printf( '<meta property="og:type" content="website">' . "\n" );
		printf( '<meta property="og:url" content="%s">' . "\n", esc_url( $url ) );
		printf( '<meta property="og:site_name" content="DE Educare">' . "\n" );
		$img = in_array( $key, array( 'cat', 'cet', 'omet' ), true ) ? de_setting( 'img_' . $key ) : de_setting( 'img_cat' );
		if ( $img ) {
			printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $img ) );
		}
		echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
	}

	echo '<script type="application/ld+json">' . wp_json_encode( de_jsonld( $key, $url ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
}, 5 );

function de_jsonld( $key, $url ) {
	$org_id = home_url( '/#org' );
	$graph  = array();

	if ( ! de_seo_plugin_active() ) {
		$graph[] = array(
			'@type'     => 'EducationalOrganization',
			'@id'       => $org_id,
			'name'      => 'DE Educare',
			'legalName' => 'DE EDUCARE LLP',
			'url'       => home_url( '/' ),
			'email'     => de_setting( 'email' ),
			'telephone' => preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ),
			'address'   => array( '@type' => 'PostalAddress', 'addressLocality' => 'Mumbai', 'addressRegion' => 'Maharashtra', 'addressCountry' => 'IN' ),
			'sameAs'    => array_values( array_filter( array( de_setting( 'facebook' ), de_setting( 'instagram' ), de_setting( 'youtube' ), de_setting( 'telegram' ) ) ) ),
		);
	}

	// Courses with a real price.
	$plan_exams = 'home' === $key ? array( 'cat' ) : ( in_array( $key, array( 'cat', 'cet', 'omet' ), true ) ? array( $key ) : array() );
	foreach ( $plan_exams as $ex ) {
		foreach ( de_plans()[ $ex ] as $p ) {
			if ( empty( $p['amount'] ) ) {
				continue;
			}
			$graph[] = array(
				'@type'       => 'Course',
				'name'        => $p['name'],
				'description' => $p['desc'],
				'provider'    => array( '@type' => 'EducationalOrganization', '@id' => $org_id, 'name' => 'DE Educare', 'sameAs' => home_url( '/' ) ),
				'offers'      => array( '@type' => 'Offer', 'price' => (string) $p['amount'], 'priceCurrency' => 'INR', 'category' => 'Paid', 'url' => $url ),
				'hasCourseInstance' => array( '@type' => 'CourseInstance', 'courseMode' => 'Online', 'courseWorkload' => 'PT2H' ),
			);
		}
	}

	// FAQs exactly as shown on the page.
	$faqs = array();
	if ( 'home' === $key ) {
		$faqs = de_home_faqs();
	} elseif ( 'free' === $key ) {
		$faqs = de_free_faqs();
	} elseif ( in_array( $key, array( 'cat', 'cet' ), true ) ) {
		$faqs = de_exams()[ $key ]['faq'];
	} elseif ( 'omet' === $key ) {
		foreach ( array_keys( de_omets() ) as $k ) {
			$faqs = array_merge( $faqs, de_omet_view( $k )['faq'] );
		}
	}
	if ( $faqs ) {
		$graph[] = array(
			'@type'      => 'FAQPage',
			'mainEntity' => array_map( function ( $f ) {
				return array( '@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $f[1] ) );
			}, $faqs ),
		);
	}

	if ( 'home' !== $key ) {
		$names = array( 'cat' => 'CAT', 'cet' => 'MBA-CET', 'omet' => 'OMETs', 'free' => 'Free resources', 'contact' => 'Contact' );
		$items = array( array( 'Home', home_url( '/' ) ) );
		if ( in_array( $key, array( 'cat', 'cet', 'omet' ), true ) ) {
			$items[] = array( 'MBA entrance', null );
		}
		$items[] = array( $names[ $key ], $url );
		$list    = array();
		foreach ( $items as $i => $it ) {
			$entry = array( '@type' => 'ListItem', 'position' => $i + 1, 'name' => $it[0] );
			if ( $it[1] ) {
				$entry['item'] = $it[1];
			}
			$list[] = $entry;
		}
		$graph[] = array( '@type' => 'BreadcrumbList', 'itemListElement' => $list );
	}

	return array( '@context' => 'https://schema.org', '@graph' => $graph );
}

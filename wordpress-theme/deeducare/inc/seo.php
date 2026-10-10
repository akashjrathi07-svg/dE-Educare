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

/** Title and description per page (from the search audit: titles 50–60 characters, descriptions 140–158). */
function de_seo_meta() {
	return array(
		'home'    => array( 'CAT 2027 & CET 2028 Coaching, Mock Tests | DE Educare', 'CAT 2027 and CET 2028 coaching with live classes and mentors, plus CAT, MBA-CET and OMET mock tests with AI analysis. Free daily test and college predictor.' ),
		'cat'     => array( 'CAT Mock Test Series 2026: 20 Mocks, ₹2,500 | DE Educare', '20 full CAT mocks, 30 sectionals and topic tests with All-India percentile and AI analysis. Or 10 CAT mocks for ₹1,200. Start with a free daily test.' ),
		'cet'     => array( 'MBA CET Mock Test 2027 – MAH-CET Online Practice | DE Educare', 'Take MAH-CET mocks in the real exam interface with instant scoring. Pattern, percentile needed for JBIMS and Sydenham, and a free daily test.' ),
		'omet'    => array( 'OMET Mock Tests: SNAP, NMAT, XAT & CMAT | DE Educare', 'Online mock tests for SNAP, NMAT, XAT and CMAT, timed and scored like the real paper. See each exam’s pattern and start with a free test.' ),
		'free'    => array( 'Free CAT Mock Test, Questions & Predictor | DE Educare', 'Free CAT, MBA-CET and SNAP daily tests, CAT questions with worked solutions, previous papers as mocks, and percentile and college predictors. No card.' ),
		'contact' => array( 'Contact DE Educare – Free Counselling Call, Mumbai', 'Talk to the DE Educare team in Mumbai about CAT, MBA-CET and OMET coaching and test series. Request a call back or WhatsApp us, 9 AM–6 PM, Mon–Fri.' ),
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
		$img = de_setting( 'img_share' );
		if ( $img ) {
			printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $img ) );
			echo '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' . "\n";
			printf( '<meta property="og:image:alt" content="%s">' . "\n", esc_attr( 'DE Educare: practice the exam, not just the syllabus' ) );
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
			'logo'      => has_custom_logo() ? wp_get_attachment_image_url( get_theme_mod( 'custom_logo' ), 'full' ) : de_asset_img( 'de-educare-share.jpg' ),
			'description' => 'Mumbai-based MBA entrance prep: CAT and MBA-CET coaching, and online mock tests, sectional tests and topic tests for CAT, MBA-CET and OMETs with AI analysis.',
			'email'     => de_setting( 'email' ),
			'telephone' => preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ),
			'address'   => array( '@type' => 'PostalAddress', 'addressLocality' => 'Mumbai', 'addressRegion' => 'Maharashtra', 'addressCountry' => 'IN' ),
			'sameAs'    => array_values( array_filter( array( de_setting( 'facebook' ), de_setting( 'instagram' ), de_setting( 'youtube' ), de_setting( 'telegram' ) ) ) ),
		);
	}

	if ( 'home' === $key && ! de_seo_plugin_active() ) {
		$graph[] = array( '@type' => 'WebSite', '@id' => home_url( '/#website' ), 'url' => home_url( '/' ), 'name' => 'DE Educare', 'publisher' => array( '@id' => $org_id ), 'inLanguage' => 'en-IN' );
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

	// Coaching programmes (home and the matching exam page).
	$coach_for = array( 'home' => array( 'cat-coaching-2027', 'cet-coaching-2028', 'mba-plus' ), 'cat' => array( 'cat-coaching-2027', 'mba-plus' ), 'cet' => array( 'cet-coaching-2028', 'mba-plus' ), 'omet' => array( 'mba-plus' ) );
	foreach ( de_coaching() as $c ) {
		if ( ! in_array( $c['id'], $coach_for[ $key ] ?? array(), true ) ) {
			continue;
		}
		$graph[] = array(
			'@type'       => 'Course',
			'name'        => $c['name'],
			'description' => $c['for'] . '. ' . implode( ', ', $c['feat'] ) . '.',
			'provider'    => array( '@type' => 'EducationalOrganization', '@id' => $org_id, 'name' => 'DE Educare', 'sameAs' => home_url( '/' ) ),
			'offers'      => array( '@type' => 'Offer', 'price' => (string) $c['fee'], 'priceCurrency' => 'INR', 'category' => 'Paid', 'url' => $url ),
			'hasCourseInstance' => array( '@type' => 'CourseInstance', 'courseMode' => 'Blended', 'location' => 'Mumbai and online' ),
		);
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

/**
 * /llms.txt: a plain-text summary for AI assistants, built from content.php
 * so prices and pages stay in sync.
 */
add_action( 'parse_request', function () {
	$path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	if ( '/llms.txt' !== $path ) {
		return;
	}
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'Cache-Control: public, max-age=3600' );
	echo de_llms_txt(); // phpcs:ignore WordPress.Security.EscapeOutput -- plain text.
	exit;
} );

function de_llms_txt() {
	$l   = array();
	$l[] = '# DE Educare';
	$l[] = '';
	$l[] = '> DE Educare is a Mumbai-based MBA entrance preparation platform: CAT 2027 and MBA-CET 2028 coaching, and online mock tests, sectional tests and topic tests for CAT, MAH MBA-CET and OMETs (SNAP, NMAT, XAT, CMAT), with AI analysis by Guru after every attempt.';
	$l[] = '';
	$l[] = 'Operated by DE EDUCARE LLP, Mumbai, India.';
	$l[] = 'Contact: ' . de_setting( 'phone' ) . ' (phone and WhatsApp), ' . de_setting( 'hours' ) . '. Email: ' . de_setting( 'email' ) . '.';
	$l[] = 'One login (mobile number) works on the website, the student portal (' . untrailingslashit( de_portal() ) . ') and the app.';
	$l[] = '';
	$l[] = '## Coaching';
	foreach ( de_coaching() as $c ) {
		$l[] = '- ' . $c['name'] . ': ' . de_rupees( $c['fee'] ) . '. ' . $c['for'] . '. Includes: ' . implode( '; ', $c['feat'] ) . '.';
	}
	$l[] = '';
	$l[] = '## Test series (prices include GST)';
	foreach ( de_plans() as $plans ) {
		foreach ( $plans as $p ) {
			if ( '₹ —' === $p['price'] ) {
				continue;
			}
			$price = ! empty( $p['free'] ) ? 'free' : $p['price'] . ( ! empty( $p['mrp'] ) ? ' (MRP ' . de_rupees( $p['mrp'] ) . ')' : '' );
			$l[]   = '- ' . $p['name'] . ': ' . $price . '. ' . $p['desc'];
		}
	}
	$l[] = '- Free daily test for CAT, MBA-CET and SNAP, with instant scorecard and AI analysis.';
	$l[] = '';
	$l[] = '## Pages';
	$l[] = '- [CAT](' . de_page_url( 'cat' ) . '): CAT coaching, mocks, pattern, syllabus, dates, cutoffs and FAQs';
	$l[] = '- [MBA-CET](' . de_page_url( 'mba-cet' ) . '): MAH MBA-CET coaching, mocks, pattern, cutoffs';
	$l[] = '- [OMETs](' . de_page_url( 'omet' ) . '): SNAP, NMAT, XAT and CMAT mocks and patterns';
	$l[] = '- [Free resources](' . de_page_url( 'free-resources' ) . '): free tests, questions with solutions, percentile and college predictors';
	$l[] = '- [Contact](' . de_page_url( 'contact' ) . '): counselling call back';
	return implode( "\n", $l ) . "\n";
}

/**
 * Cleanup from the audit: leftover template URLs redirect to the real pages,
 * and the default "Hello world" post is gone (410).
 */
add_action( 'template_redirect', function () {
	$path = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	$map  = array(
		'contact-us' => de_page_url( 'contact' ),
		'courses'    => get_page_by_path( 'mba-entrance-exams' ) ? de_page_url( 'mba-entrance-exams' ) : home_url( '/#test-series' ),
		'dashboard'  => de_portal(),
		'register'   => de_login_url(),
		'login'      => de_login_url(),
	);
	if ( isset( $map[ $path ] ) ) {
		wp_redirect( $map[ $path ], 301 ); // phpcs:ignore WordPress.Security.SafeRedirect -- portal is another host.
		exit;
	}
	if ( 'hello-world' === $path ) {
		status_header( 410 );
		nocache_headers();
		echo '<!doctype html><title>Gone</title><p>This page has been removed. <a href="' . esc_url( home_url( '/' ) ) . '">Go to DE Educare</a></p>';
		exit;
	}
}, 1 );

/** The blog listing stays out of search until it has 3 real posts. */
add_filter( 'wp_robots', function ( $robots ) {
	if ( is_home() && ! is_front_page() && (int) wp_count_posts()->publish < 3 ) {
		$robots['noindex'] = true;
	}
	return $robots;
} );

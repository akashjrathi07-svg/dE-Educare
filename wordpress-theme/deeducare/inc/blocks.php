<?php
/**
 * The "DE Educare section" block. Each section of the design is a
 * server-rendered PHP template in /sections; templates place them with
 * <!-- wp:deeducare/section {"name":"…"} /-->. In the Site Editor the block
 * can be moved, removed or added, and shows a live preview.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Section templates the block may render, with editor labels. */
function de_sections() {
	return array(
		'header'          => 'Site header (top strip, menu)',
		'footer'          => 'Site footer',
		'floating'        => 'WhatsApp button and mobile action bar',
		'home-hero'       => 'Home · Hero and exam picker',
		'home-marquee'    => 'Live · College marquee',
		'home-tools'      => 'Home · Quick tools',
		'home-predict'    => 'Live · Percentile and college predictor',
		'home-free'       => 'Home · Free daily tests (CAT, CET, SNAP)',
		'home-ladder'     => 'Home · Climb to 99',
		'home-compare'    => 'Home · Compare coaching programmes',
		'home-guru'       => 'Home · Guru demo',
		'home-soon'       => 'Home · Government exams',
		'home-community'  => 'Home · One login and community',
		'home-voices'     => 'Live · Student reviews (from the portal)',
		'home-faq'        => 'Home · FAQs',
		'exam'            => 'Exam page, whole (older layout)',
		'exam-tabs'       => 'Live · Exam tabs with banner and prices',
		'test-series'     => 'Live · Test series price cards',
		'exam-free-tests' => 'Live · Free tests for an exam',
		'exam-tests'      => 'Live · Test series catalogue for an exam',
		'exam-plans'      => 'Live · Test series plans and prices for an exam',
		'exam-aside'      => 'Live · Exam sidebar (coaching fee, test series price)',
		'enquiry-form'    => 'Live · Coaching enquiry form',
		'free-questions'  => 'Live · Free practice questions',
		'free-tests-all'  => 'Live · Free tests (CAT, MBA-CET, SNAP)',
		'free-notes'      => 'Live · Free notes and PDFs from the portal',
		'contact-form'    => 'Live · Call-back request form',
		'free'            => 'Free resources page',
		'contact'         => 'Contact page',
	);
}

/**
 * Exam view for a block's "exam" setting: CAT and MBA-CET use their own data,
 * SNAP/NMAT/XAT/CMAT use the OMET view. Returns [ view, plan group, key ].
 */
function de_exam_view( $exam ) {
	if ( in_array( $exam, array( 'snap', 'nmat', 'xat', 'cmat' ), true ) ) {
		return array( de_omet_view( $exam ), 'omet', $exam );
	}
	if ( 'omet' === $exam ) {
		return array( de_omet_view( 'snap' ), 'omet', 'snap' );
	}
	return array( de_exams()[ $exam ], $exam, $exam );
}

function de_render_section( $attributes ) {
	$name = $attributes['name'] ?? '';
	if ( ! isset( de_sections()[ $name ] ) ) {
		return '';
	}
	$exam = in_array( $attributes['exam'] ?? '', array( 'cat', 'cet', 'omet', 'snap', 'nmat', 'xat', 'cmat' ), true ) ? $attributes['exam'] : 'cat';
	ob_start();
	include DE_THEME_DIR . '/sections/' . $name . '.php';
	return ob_get_clean();
}

add_action( 'init', function () {
	wp_register_script(
		'deeducare-editor',
		DE_THEME_URI . '/assets/js/editor.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render', 'wp-i18n' ),
		DE_THEME_VERSION,
		true
	);
	wp_localize_script( 'deeducare-editor', 'DE_SECTIONS', de_sections() );

	register_block_type( 'deeducare/section', array(
		'api_version'     => 3,
		'title'           => __( 'DE Educare section', 'deeducare' ),
		'category'        => 'theme',
		'attributes'      => array(
			'name' => array( 'type' => 'string', 'default' => 'home-hero' ),
			'exam' => array( 'type' => 'string', 'default' => 'cat' ),
		),
		'supports'        => array( 'html' => false, 'align' => false ),
		'editor_script'   => 'deeducare-editor',
		'render_callback' => 'de_render_section',
	) );
} );

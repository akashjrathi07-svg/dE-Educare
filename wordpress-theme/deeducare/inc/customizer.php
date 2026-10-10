<?php
/**
 * Appearance → Customize → DE Educare: portal link, contact details,
 * exam date, social links and photos.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

add_action( 'customize_register', function ( WP_Customize_Manager $wp ) {
	$wp->add_panel( 'de_panel', array( 'title' => __( 'DE Educare', 'deeducare' ), 'priority' => 30 ) );

	$sections = array(
		'de_links'   => array(
			'title'  => __( 'Portal and contact', 'deeducare' ),
			'fields' => array(
				'portal_url' => array( __( 'Student portal URL', 'deeducare' ), 'url', __( 'Sign in, tests and checkout all link here.', 'deeducare' ) ),
				'app_url'    => array( __( 'Mobile app link (Play Store / App Store)', 'deeducare' ), 'url', '' ),
				'phone'      => array( __( 'Phone (as shown)', 'deeducare' ), 'text', '' ),
				'whatsapp'   => array( __( 'WhatsApp number (digits with country code)', 'deeducare' ), 'text', '' ),
				'email'      => array( __( 'Email', 'deeducare' ), 'email', '' ),
				'hours'      => array( __( 'Office hours', 'deeducare' ), 'text', '' ),
				'city'       => array( __( 'Location', 'deeducare' ), 'text', '' ),
				'contact_to' => array( __( 'Send call-back requests to', 'deeducare' ), 'email', __( 'Leave empty to use the site admin email.', 'deeducare' ) ),
				'lead_webhook' => array( __( 'CRM webhook for enquiries (n8n)', 'deeducare' ), 'url', __( 'Every coaching enquiry and call-back request is POSTed here as JSON, and also emailed.', 'deeducare' ) ),
				'cat_date'   => array( __( 'CAT exam date (YYYY-MM-DD)', 'deeducare' ), 'text', __( 'Drives the countdown in the top strip.', 'deeducare' ) ),
			),
		),
		'de_social'  => array(
			'title'  => __( 'Community and social links', 'deeducare' ),
			'fields' => array(
				'whatsapp_group' => array( __( 'WhatsApp group', 'deeducare' ), 'url', '' ),
				'telegram'       => array( __( 'Telegram', 'deeducare' ), 'url', '' ),
				'youtube'        => array( __( 'YouTube', 'deeducare' ), 'url', '' ),
				'instagram'      => array( __( 'Instagram', 'deeducare' ), 'url', '' ),
				'facebook'       => array( __( 'Facebook', 'deeducare' ), 'url', '' ),
			),
		),
		'de_images'  => array(
			'title'  => __( 'Exam banners and share image', 'deeducare' ),
			'fields' => array(
				'img_cat'  => array( __( 'CAT banner', 'deeducare' ), 'image', '' ),
				'img_cet'  => array( __( 'MBA-CET banner', 'deeducare' ), 'image', '' ),
				'img_omet' => array( __( 'OMETs banner', 'deeducare' ), 'image', '' ),
				'img_govt' => array( __( 'Government exams banner (home)', 'deeducare' ), 'image', '' ),
				'img_bank' => array( __( 'Bank PO card', 'deeducare' ), 'image', '' ),
				'img_rbi'  => array( __( 'RBI card', 'deeducare' ), 'image', '' ),
				'img_upsc' => array( __( 'UPSC card', 'deeducare' ), 'image', '' ),
				'img_share' => array( __( 'Share image for links (1200×630)', 'deeducare' ), 'image', '' ),
			),
		),
	);

	$defaults = de_setting_defaults();
	foreach ( $sections as $section_id => $section ) {
		$wp->add_section( $section_id, array( 'title' => $section['title'], 'panel' => 'de_panel' ) );
		foreach ( $section['fields'] as $key => list( $label, $type, $desc ) ) {
			$sanitize = in_array( $type, array( 'url', 'image' ), true ) ? 'esc_url_raw' : ( 'email' === $type ? 'sanitize_email' : 'sanitize_text_field' );
			$wp->add_setting( 'de_' . $key, array( 'default' => $defaults[ $key ], 'sanitize_callback' => $sanitize ) );
			if ( 'image' === $type ) {
				$wp->add_control( new WP_Customize_Image_Control( $wp, 'de_' . $key, array( 'label' => $label, 'section' => $section_id ) ) );
			} else {
				$wp->add_control( 'de_' . $key, array( 'label' => $label, 'type' => $type, 'section' => $section_id, 'description' => $desc ) );
			}
		}
	}
} );

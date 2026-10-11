<?php
/**
 * Test series plans for an exam, with live prices from the portal (Admin → Courses & plans).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( , $group ) = de_exam_view( $exam );
de_render_plans( $group );

<?php
/**
 * Free test cards for one exam: today's daily test, the free mock, previous
 * papers and a free sectional. The heading above is an editable block.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( $view, $group, $key ) = de_exam_view( $exam );
de_render_free_tests( $view, $group, false, false );

<?php
/**
 * Test series catalogue (mocks, sectionals, topic tests) for one exam; every test links to the portal.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( $view, $group, $key ) = de_exam_view( $exam );
?>
<div class="de-stack-16 de-anchor" id="<?php echo esc_attr( 'omet' === $group ? 'tests-' . $key : 'tests' ); ?>">
	<?php de_render_tests( $view, $group, 'omet' === $group ? 'om-' . $key : $key ); ?>
</div>

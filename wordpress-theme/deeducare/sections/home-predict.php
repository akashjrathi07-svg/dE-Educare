<?php
/**
 * Percentile predictor and college predictor on the home page.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="de-wrap de-sec-40 de-stack-16" data-reveal>
	<?php de_predictors( 'predict', true ); ?>
</section>

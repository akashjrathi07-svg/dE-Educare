<?php
/**
 * Quick tools row.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$free  = de_page_url( 'free-resources' );
$tools = array(
	array( '5Q', 'Daily free test', 'VARC, DILR, Quant', de_daily_url( 'cat' ), 'solid' ),
	array( 'FQ', 'Free questions', 'Worked solutions', $free, 'blue' ),
	array( '%', 'Percentile predictor', 'Score to percentile', $free . '#predictor', 'blue' ),
	array( 'PY', 'Previous papers', 'Attempt as mocks', $free . '#free-tests', 'blue' ),
	array( 'AI', 'Ask Guru', 'Free AI mentor', '#guru', 'free' ),
);
?>
<section class="de-wrap de-tools" data-reveal>
	<?php foreach ( $tools as $t ) : ?>
		<a class="de-tool" href="<?php echo esc_url( $t[3] ); ?>">
			<span class="de-mono-badge de-mono-badge--lg de-mono-badge--<?php echo esc_attr( $t[4] ); ?>"><?php de_e( $t[0] ); ?></span>
			<span class="de-tool__txt"><span class="de-tool__t"><?php de_e( $t[1] ); ?></span><span class="de-tool__d"><?php de_e( $t[2] ); ?></span></span>
		</a>
	<?php endforeach; ?>
</section>

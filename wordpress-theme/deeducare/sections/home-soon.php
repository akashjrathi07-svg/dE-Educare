<?php
/**
 * Government exams launching soon. "Notify me" opens the contact form with the exam preselected.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$cards = array(
	array( 'Bank PO', 'IBPS PO and SBI PO prelims and mains test series.', 'img_bank' ),
	array( 'RBI', 'RBI Grade B Phase 1 and Phase 2 mocks.', 'img_rbi' ),
	array( 'UPSC', 'Prelims GS and CSAT mocks with mains answer evaluation.', 'img_upsc' ),
);
?>
<section class="de-wrap de-sec-40 de-stack-22" data-reveal>
	<h2 class="de-h2 de-h2--md">Government exams, launching soon</h2>
	<div class="de-grid de-grid--300">
		<?php foreach ( $cards as $c ) : ?>
			<article class="de-soon-card">
				<div class="de-soon-card__img"><?php de_image( $c[2], $c[0], 'de-img de-img--cover' ); ?></div>
				<div class="de-soon-card__body">
					<h3 class="de-soon-card__t"><?php de_e( $c[0] ); ?></h3>
					<p class="de-soon-card__d"><?php de_e( $c[1] ); ?></p>
					<a class="de-link-strong" href="<?php echo esc_url( add_query_arg( 'exam', $c[0], de_page_url( 'contact' ) ) ); ?>">Notify me →</a>
				</div>
			</article>
		<?php endforeach; ?>
	</div>
</section>

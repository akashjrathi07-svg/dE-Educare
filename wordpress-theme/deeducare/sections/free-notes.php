<?php
/**
 * Free notes and PDFs from the portal (Admin → Free resources); open view-only after sign-in.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$notes = de_free_resources();
?>
	<div class="de-stack-14 de-anchor" id="notes" data-reveal>
		<?php if ( $notes ) : ?>
			<div class="de-grid de-grid--280">
				<?php foreach ( $notes as $n ) : ?>
					<a class="de-res" href="<?php echo esc_url( $n['url'] ); ?>">
						<span class="de-res__big"><?php de_e( strtoupper( $n['exam'] ?? 'PDF' ) ); ?></span>
						<span class="de-res__txt"><span class="de-res__t"><?php de_e( $n['title'] ); ?></span><span class="de-res__d"><?php de_e( trim( ( $n['kind'] ?? 'PDF' ) . ( ! empty( $n['pages'] ) ? ' · ' . $n['pages'] . ' pages' : '' ) . ( ! empty( $n['desc'] ) ? ' · ' . $n['desc'] : '' ) ) ); ?></span></span>
						<span class="de-blue" aria-hidden="true">→</span>
					</a>
				<?php endforeach; ?>
			</div>
		<?php else : ?>
			<a class="de-res" href="<?php echo esc_url( de_portal( 'library' ) ); ?>">
				<span class="de-res__big">PDF</span>
				<span class="de-res__txt"><span class="de-res__t">Open the free library</span><span class="de-res__d">Quant formula sheet, DILR set types, VARC reading list</span></span>
				<span class="de-blue" aria-hidden="true">→</span>
			</a>
		<?php endif; ?>
	</div>

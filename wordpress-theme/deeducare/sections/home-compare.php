<?php
/**
 * Coaching programmes compared. Each "Enquire" opens the lead form.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$plans = de_coaching();
$rows  = de_coaching_rows();
$icons = array( array( 'icon-mentor.webp', 'Live lectures by mentors' ), array( 'icon-books.webp', 'Books and study material' ), array( 'icon-checklist.webp', 'Mocks and tests' ), array( 'icon-support.webp', 'Guru, available 24/7' ) );
?>
<section class="de-wrap de-compare" id="coaching" data-reveal>
	<div class="de-split de-split--end">
		<div class="de-stack-10">
			<span class="de-eyebrow de-eyebrow--blue">COACHING · NEW BATCHES</span>
			<h2 class="de-h2 de-h2--lg">Compare coaching programmes</h2>
		</div>
		<ul class="de-feats" aria-label="Included in every programme">
			<?php foreach ( $icons as $ic ) : ?>
				<li><?php de_icon_img( $ic[0], '', 40 ); ?><span><?php de_e( $ic[1] ); ?></span></li>
			<?php endforeach; ?>
		</ul>
	</div>

	<?php // Cards on phones, table on wider screens. ?>
	<div class="de-coach-cards">
		<?php foreach ( $plans as $p ) : ?>
			<article class="de-plan<?php echo ! empty( $p['dark'] ) ? ' is-dark' : ''; ?>">
				<div class="de-plan__top">
					<h3 class="de-plan__name"><?php de_e( $p['name'] ); ?></h3>
					<?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?>
				</div>
				<span class="de-plan__price"><?php de_e( de_rupees( $p['fee'] ) ); ?></span>
				<p class="de-plan__desc"><?php de_e( $p['for'] ); ?></p>
				<ul class="de-plan__feat">
					<?php foreach ( $p['feat'] as $f ) : ?>
						<li><span class="de-plan__check" aria-hidden="true">✓</span><?php de_e( $f ); ?></li>
					<?php endforeach; ?>
				</ul>
				<?php de_lead_button( $p['id'], 'Enquire now', 'de-btn de-btn--block ' . ( ! empty( $p['dark'] ) ? 'de-btn--amber' : 'de-btn--primary' ) ); ?>
			</article>
		<?php endforeach; ?>
	</div>

	<div class="de-compare__scroll">
		<table class="de-compare__table">
			<caption class="screen-reader-text">Coaching programmes compared</caption>
			<thead>
				<tr>
					<th scope="col" class="de-compare__corner">What you get</th>
					<?php foreach ( $plans as $p ) : ?>
						<th scope="col" class="de-compare__head<?php echo ! empty( $p['dark'] ) ? ' is-dark' : ''; ?>">
							<span class="de-compare__name"><?php de_e( $p['name'] ); ?><?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?></span>
							<span class="de-compare__price"><?php de_e( de_rupees( $p['fee'] ) ); ?></span>
							<?php de_lead_button( $p['id'], 'Enquire now', 'de-btn de-btn--block de-btn--sm ' . ( ! empty( $p['dark'] ) ? 'de-btn--amber' : 'de-btn--primary' ) ); ?>
						</th>
					<?php endforeach; ?>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $rows as $r ) : ?>
					<tr>
						<th scope="row"><?php de_e( $r[0] ); ?></th>
						<?php for ( $i = 1; $i <= 3; $i++ ) : ?>
							<?php $v = $r[ $i ]; ?>
							<td class="<?php echo '—' === $v ? 'is-none' : ( '✓' === $v ? 'is-yes' : '' ); ?><?php echo 1 === $i ? ' is-hl' : ''; ?>"><?php if ( '✓' === $v ) : ?><span aria-label="Included">✓</span><?php elseif ( '—' === $v ) : ?><span aria-label="Not included">—</span><?php else : de_e( $v ); endif; ?></td>
						<?php endfor; ?>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	</div>
	<p class="de-note de-note--sm">Programme fees per student. Send an enquiry for batch start dates, timings and payment options.</p>
</section>

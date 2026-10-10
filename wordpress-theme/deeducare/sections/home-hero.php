<?php
/**
 * Home hero: headline, CTAs, exam picker (coaching + test series per exam)
 * and test series cards with test counts and prices.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$contact  = de_page_url( 'contact' );
$coaching = array();
foreach ( de_coaching() as $c ) {
	$coaching[ $c['id'] ] = $c;
}
$hx = array(
	array( 'id' => 'cat', 'name' => 'CAT', 'sub' => 'Coaching 2027 · Test Series', 'status' => 'LIVE', 'img' => 'img_cat', 'coach' => 'cat-coaching-2027', 'plan' => 'cat-ts', 'tests' => '20 mocks · 30 sectionals · 3 topic tests each', 'cta' => 'Explore CAT', 'url' => de_page_url( 'cat' ) ),
	array( 'id' => 'cet', 'name' => 'MBA-CET', 'sub' => 'Coaching 2028 · Test Series', 'status' => 'LIVE', 'img' => 'img_cet', 'coach' => 'cet-coaching-2028', 'plan' => 'cet-ts', 'tests' => '30 mocks · 40 sectionals · 3 topic tests each', 'cta' => 'Explore MBA-CET', 'url' => de_page_url( 'mba-cet' ) ),
	array( 'id' => 'omet', 'name' => 'OMETs', 'sub' => 'SNAP · NMAT · XAT · CMAT', 'status' => 'LIVE', 'img' => 'img_omet', 'coach' => 'mba-plus', 'plan' => 'om-pack', 'tests' => '15 mocks per exam · sectionals · 3 topic tests each', 'cta' => 'Explore OMETs', 'url' => de_page_url( 'omet' ) ),
	array( 'id' => 'govt', 'name' => 'Govt exams', 'sub' => 'Bank PO · RBI · UPSC', 'status' => 'SOON', 'img' => 'img_govt', 'coach' => '', 'plan' => '', 'tests' => '', 'cta' => 'Get notified', 'url' => add_query_arg( 'exam', 'Bank PO', $contact ) ),
);
$trust = array( 'Free daily test, no card', 'AI analysis on every attempt', 'One login on web and app', 'Mumbai-based team' );

/** Price with the struck-through MRP and the saving. */
$price = function ( $p, $size = '' ) {
	if ( ! $p ) {
		return;
	}
	echo '<span class="de-price' . ( $size ? ' de-price--' . esc_attr( $size ) : '' ) . '">';
	echo '<span class="de-price__now">' . esc_html( $p['price'] ) . '</span>';
	if ( ! empty( $p['mrp'] ) && ! empty( $p['amount'] ) && $p['mrp'] > $p['amount'] ) {
		echo '<s class="de-price__was"><span class="screen-reader-text">was </span>' . esc_html( de_rupees( $p['mrp'] ) ) . '</s>';
		echo '<span class="de-price__off">Save ' . esc_html( de_rupees( $p['mrp'] - $p['amount'] ) ) . '</span>';
	}
	echo '</span>';
};
?>
<section class="de-wrap de-hero" data-reveal>
	<div class="de-hero__top">
		<h1 class="de-hero__h">CAT 2027 &amp; CET 2028 coaching,<br><span class="de-blue">with mocks that feel real.</span></h1>
		<div class="de-hero__side">
			<p class="de-lead">Live classes, recorded sessions, books and one-on-one mentorship, plus full mocks, sectionals and topic tests timed and scored like the real paper. Guru, your AI mentor, reads every attempt and tells you what to fix next.</p>
			<div class="de-row">
				<?php de_lead_button( 'cat-coaching-2027', 'Enquire for coaching', 'de-btn de-btn--primary de-btn--xl' ); ?>
				<a class="de-btn de-btn--outline de-btn--xl" href="<?php echo esc_url( de_daily_url( 'cat' ) ); ?>">Take today’s free test</a>
			</div>
			<ul class="de-trust">
				<?php foreach ( $trust as $t ) : ?>
					<li><span class="de-check" aria-hidden="true">✓</span><?php de_e( $t ); ?></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>

	<div class="de-hero__picker" data-picker>
		<div class="de-hero__list" role="tablist" aria-label="<?php esc_attr_e( 'Exams', 'deeducare' ); ?>">
			<?php foreach ( $hx as $i => $h ) : ?>
				<a class="de-hero__exam" href="<?php echo esc_url( $h['url'] ); ?>" role="tab" aria-selected="<?php echo 0 === $i ? 'true' : 'false'; ?>" aria-controls="hero-<?php echo esc_attr( $h['id'] ); ?>" data-pick="<?php echo (int) $i; ?>">
					<span class="de-hero__n">0<?php echo (int) $i + 1; ?></span>
					<span class="de-hero__name"><span class="de-hero__t"><?php de_e( $h['name'] ); ?></span><span class="de-hero__s"><?php de_e( $h['sub'] ); ?></span></span>
					<span class="de-status de-status--<?php echo 'LIVE' === $h['status'] ? 'live' : 'soon'; ?>"><span class="screen-reader-text"> · </span><?php echo 'LIVE' === $h['status'] ? 'LIVE' : 'COMING SOON'; ?></span>
				</a>
			<?php endforeach; ?>
		</div>
		<div class="de-hero__banners">
			<?php foreach ( $hx as $i => $h ) : ?>
				<?php
				$c = $h['coach'] ? $coaching[ $h['coach'] ] : null;
				$p = $h['plan'] ? de_plan( $h['plan'] ) : null;
				?>
				<div class="de-hero__banner" id="hero-<?php echo esc_attr( $h['id'] ); ?>" role="tabpanel" data-pick-panel="<?php echo (int) $i; ?>"<?php echo 0 === $i ? '' : ' hidden'; ?>>
					<div class="de-hero__img">
						<?php de_image( $h['img'], $h['name'] . ' mock tests and coaching by DE Educare', 'de-img de-img--cover', 0 === $i ); ?>
					</div>
					<div class="de-hero__offer">
						<?php if ( $c ) : ?>
							<div class="de-hero__row">
								<div class="de-hero__what">
									<span class="de-eyebrow de-eyebrow--amber de-eyebrow--sm">COACHING</span>
									<span class="de-hero__pn"><?php de_e( $c['name'] ); ?></span>
									<span class="de-hero__pd"><?php de_e( $c['for'] ); ?></span>
								</div>
								<span class="de-hero__fee"><?php de_e( de_rupees( $c['fee'] ) ); ?></span>
								<?php de_lead_button( $c['id'], 'Enquire', 'de-btn de-btn--amber' ); ?>
							</div>
						<?php endif; ?>
						<?php if ( $p ) : ?>
							<div class="de-hero__row">
								<div class="de-hero__what">
									<span class="de-eyebrow de-eyebrow--sm de-hero__ey">TEST SERIES</span>
									<span class="de-hero__pn"><?php de_e( $p['name'] ); ?></span>
									<span class="de-hero__pd"><?php de_e( $h['tests'] ); ?></span>
								</div>
								<?php $price( $p, 'dark' ); ?>
								<a class="de-btn de-btn--white" <?php echo de_plan_action( $p, $h['id'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>>Buy</a>
							</div>
						<?php endif; ?>
						<?php if ( ! $c && ! $p ) : ?>
							<div class="de-hero__row">
								<div class="de-hero__what">
									<span class="de-hero__pn">Bank PO, RBI Grade B and UPSC</span>
									<span class="de-hero__pd">Test series launching soon. Leave your number to hear first.</span>
								</div>
								<a class="de-btn de-btn--amber" href="<?php echo esc_url( $h['url'] ); ?>"><?php de_e( $h['cta'] ); ?> →</a>
							</div>
						<?php else : ?>
							<a class="de-hero__more" href="<?php echo esc_url( $h['url'] ); ?>"><?php de_e( $h['cta'] ); ?>: pattern, syllabus, free tests →</a>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>

	<div class="de-stack-12" id="test-series">
		<div class="de-split de-split--end">
			<h2 class="de-h2">Test series: pick your exam</h2>
			<span class="de-note de-note--sm">Prices include GST · UPI, cards and EMI</span>
		</div>
		<div class="de-ts">
			<?php foreach ( de_test_series() as $t ) : ?>
				<?php
				$p = de_plan( $t['plan'] );
				if ( ! $p ) {
					continue;
				}
				?>
				<article class="de-ts__card<?php echo 'cat-ts' === $t['plan'] ? ' is-hl' : ''; ?>">
					<div class="de-ts__top">
						<h3 class="de-ts__name"><a href="<?php echo esc_url( $t['url'] ); ?>"><?php de_e( $t['name'] ); ?></a></h3>
						<?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?>
					</div>
					<dl class="de-ts__counts">
						<?php foreach ( $t['counts'] as $n ) : ?>
							<div><dt><?php de_e( $n[1] ); ?></dt><dd><?php de_e( $n[0] ); ?></dd></div>
						<?php endforeach; ?>
					</dl>
					<?php $price( $p ); ?>
					<?php if ( 'om-single' === $t['plan'] ) : ?>
						<a class="de-btn de-btn--primary de-btn--block" href="<?php echo esc_url( $t['url'] ); ?>">Choose your OMET</a>
					<?php else : ?>
						<a class="de-btn de-btn--primary de-btn--block" <?php echo de_plan_action( $p, $t['exam'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>>Buy now</a>
					<?php endif; ?>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>

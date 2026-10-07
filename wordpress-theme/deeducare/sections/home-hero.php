<?php
/**
 * Home hero: headline, CTAs, trust row, exam picker with a banner that changes on hover.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$contact = de_page_url( 'contact' );
$hx      = array(
	array( 'id' => 'cat', 'name' => 'CAT', 'sub' => 'IIMs and top B-schools', 'status' => 'LIVE', 'img' => 'img_cat', 'tone' => '#1F3A8A', 'stats' => array( array( '20', 'Mocks' ), array( '30', 'Sectionals' ), array( '₹2,500', 'Test Series' ) ), 'cta' => 'Explore CAT', 'url' => de_page_url( 'cat' ) ),
	array( 'id' => 'cet', 'name' => 'MBA-CET', 'sub' => 'JBIMS, Sydenham, PUMBA, Welingkar', 'status' => 'LIVE', 'img' => 'img_cet', 'tone' => '#2C3FA8', 'stats' => array( array( '200', 'Questions' ), array( '150', 'Minutes' ), array( '0', 'Negative' ) ), 'cta' => 'Explore MBA-CET', 'url' => de_page_url( 'mba-cet' ) ),
	array( 'id' => 'omet', 'name' => 'OMETs', 'sub' => 'SNAP · NMAT · XAT · CMAT', 'status' => 'LIVE', 'img' => 'img_omet', 'tone' => 'oklch(0.42 0.12 280)', 'stats' => array( array( '4', 'Exams' ), array( '1', 'Mock pack' ) ), 'cta' => 'Explore OMETs', 'url' => de_page_url( 'omet' ) ),
	array( 'id' => 'govt', 'name' => 'Bank PO · RBI · UPSC', 'sub' => 'Government exam test series', 'status' => 'SOON', 'img' => 'img_govt', 'tone' => '#0E1230', 'stats' => array( array( '3', 'Exams' ), array( '2026', 'Launch' ) ), 'cta' => 'Get notified', 'url' => add_query_arg( 'exam', 'Bank PO', $contact ) ),
);
$trust = array( 'Free daily test, no card', 'AI analysis on every attempt', 'One login on web and app', 'Mumbai-based team' );
?>
<section class="de-wrap de-hero" data-reveal>
	<div class="de-hero__top">
		<h1 class="de-hero__h">Practice the exam,<br><span class="de-blue">not just the syllabus.</span></h1>
		<div class="de-hero__side">
			<p class="de-lead">Full mock tests, sectional tests and topic tests for CAT, MBA-CET and OMETs, timed and scored like the real paper. Guru, your AI mentor, reads every attempt and tells you what to fix next.</p>
			<div class="de-row">
				<a class="de-btn de-btn--primary de-btn--xl" href="<?php echo esc_url( de_daily_url( 'cat' ) ); ?>">Take today’s free test</a>
				<a class="de-btn de-btn--outline de-btn--xl" href="<?php echo esc_url( de_page_url( 'cat' ) ); ?>">See CAT Test Series</a>
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
					<span class="de-status de-status--<?php echo 'LIVE' === $h['status'] ? 'live' : 'soon'; ?>"><?php de_e( $h['status'] ); ?></span>
				</a>
			<?php endforeach; ?>
		</div>
		<div class="de-hero__banners">
			<?php foreach ( $hx as $i => $h ) : ?>
				<div class="de-hero__banner" id="hero-<?php echo esc_attr( $h['id'] ); ?>" role="tabpanel" style="background:<?php echo esc_attr( $h['tone'] ); ?>" data-pick-panel="<?php echo (int) $i; ?>"<?php echo 0 === $i ? '' : ' hidden'; ?>>
					<?php de_image( $h['img'], $h['name'] . ' banner', 'de-img de-img--cover' ); ?>
					<div class="de-hero__overlay">
						<div class="de-hero__stats">
							<?php foreach ( $h['stats'] as $s ) : ?>
								<div><span class="de-hero__sv"><?php de_e( $s[0] ); ?></span><span class="de-hero__sk"><?php de_e( $s[1] ); ?></span></div>
							<?php endforeach; ?>
						</div>
						<a class="de-btn de-btn--amber" href="<?php echo esc_url( $h['url'] ); ?>"><?php de_e( $h['cta'] ); ?> →</a>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

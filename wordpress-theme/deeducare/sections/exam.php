<?php
/**
 * Exam page (CAT, MBA-CET or OMETs). $exam is set by de_render_section().
 * The OMET page shows SNAP, NMAT, XAT and CMAT behind a switcher; all four
 * are in the HTML, and ?exam=nmat (or #nmat) opens that exam first.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$E       = de_exams()[ $exam ];
$is_omet = 'omet' === $exam;
$views   = array();
if ( $is_omet ) {
	foreach ( array_keys( de_omets() ) as $k ) {
		$views[ $k ] = de_omet_view( $k );
	}
	$req    = isset( $_GET['exam'] ) ? sanitize_key( wp_unslash( $_GET['exam'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	$active = isset( $views[ $req ] ) ? $req : 'snap';
} else {
	$views[ $exam ] = $E;
	$active         = $exam;
}

$plans = de_plans()[ $exam ];
$top   = $plans[0];
foreach ( $plans as $p ) {
	if ( ! empty( $p['dark'] ) ) {
		$top = $p;
		break;
	}
}
$daily   = de_daily_url( $exam );
$sec_nav = array( array( 'tests', 'Tests' ), array( 'overview', 'Overview' ), array( 'pattern', 'Exam pattern' ), array( 'syllabus', 'Syllabus' ), array( 'plans', 'Plans' ), array( 'facts', 'Eligibility & dates' ), array( 'colleges', 'Colleges' ), array( 'strategy', 'Preparation' ), array( 'faq', 'FAQs' ) );
$related = array();
foreach ( array( 'cat' => 'CAT Test Series', 'cet' => 'MBA-CET', 'omet' => 'OMETs' ) as $id => $label ) {
	if ( $id !== $exam ) {
		$related[] = array( $label, de_page_url( de_exams()[ $id ]['slug'] ) );
	}
}
$related[] = array( 'Free resources', de_page_url( 'free-resources' ) );
$related[] = array( 'Percentile predictor', de_page_url( 'free-resources' ) . '#predictor' );
$related[] = array( 'Talk to a counsellor', de_page_url( 'contact' ) );
?>
<div data-omet-root="<?php echo esc_attr( $is_omet ? $active : '' ); ?>">
<section class="de-wrap de-exam-hero" data-reveal>
	<nav class="de-crumbs" aria-label="Breadcrumb">
		<ol>
			<li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Home</a></li>
			<li>MBA entrance</li>
			<li aria-current="page"><?php de_e( $E['name'] ); ?><?php if ( $is_omet ) : ?> · <span data-omet-name><?php de_e( $views[ $active ]['name'] ); ?></span><?php endif; ?></li>
		</ol>
	</nav>
	<div class="de-grid de-grid--460 de-grid--stretch">
		<div class="de-exam-hero__copy">
			<span class="de-pill-label"><?php de_e( $E['eyebrow'] ); ?></span>
			<h1 class="de-exam-hero__h"><?php de_e( $E['title'] ); ?></h1>
			<p class="de-lead"><?php de_e( $E['intro'] ); ?></p>
			<div class="de-row">
				<a class="de-btn de-btn--primary de-btn--lg" href="<?php echo esc_url( $daily ); ?>"><?php de_e( $E['freeCta'] ); ?></a>
				<a class="de-btn de-btn--outline de-btn--lg" href="#tests" data-scroll-link>Browse all tests</a>
			</div>
		</div>
		<div class="de-exam-hero__img" style="background:<?php echo esc_attr( $E['tone'] ); ?>">
			<?php de_image( $E['img'], $E['name'] . ' banner photo', 'de-img de-img--cover' ); ?>
		</div>
	</div>
	<?php foreach ( $views as $k => $v ) : ?>
		<dl class="de-stats"<?php echo $is_omet ? ' data-omet-panel="' . esc_attr( $k ) . '"' . ( $k === $active ? '' : ' hidden' ) : ''; ?>>
			<?php foreach ( ( $is_omet ? $v['stats'] : $E['stats'] ) as $s ) : ?>
				<div><dt><?php de_e( $s[1] ); ?></dt><dd><?php de_e( $s[0] ); ?></dd></div>
			<?php endforeach; ?>
		</dl>
	<?php endforeach; ?>
</section>

<nav class="de-secnav" aria-label="<?php esc_attr_e( 'On this page', 'deeducare' ); ?>" data-secnav>
	<div class="de-wrap de-secnav__in">
		<?php foreach ( $sec_nav as $i => $s ) : ?>
			<a href="#<?php echo esc_attr( $s[0] ); ?>" class="de-secnav__a<?php echo 0 === $i ? ' is-active' : ''; ?>" data-secnav-link="<?php echo esc_attr( $s[0] ); ?>"><?php de_e( $s[1] ); ?></a>
		<?php endforeach; ?>
	</div>
</nav>

<section class="de-wrap de-exam-body">
	<div class="de-exam-main">
		<?php if ( $is_omet ) : ?>
			<div class="de-stack-8">
				<span class="de-eyebrow de-eyebrow--muted">CHOOSE YOUR OMET</span>
				<div class="de-row de-row--8" role="tablist" aria-label="OMET">
					<?php foreach ( $views as $k => $v ) : ?>
						<button type="button" class="de-omet-tab" role="tab" aria-selected="<?php echo $k === $active ? 'true' : 'false'; ?>" data-omet="<?php echo esc_attr( $k ); ?>"><?php de_e( $v['name'] ); ?></button>
					<?php endforeach; ?>
				</div>
			</div>
		<?php endif; ?>

		<?php foreach ( $views as $k => $v ) : ?>
			<div class="de-exam-stack"<?php echo $is_omet ? ' data-omet-panel="' . esc_attr( $k ) . '"' . ( $k === $active ? '' : ' hidden' ) : ''; ?>>
				<?php de_render_exam_a( $v, $exam, $is_omet ? 'om-' . $k : $exam, $k === $active ); ?>
			</div>
		<?php endforeach; ?>

		<?php de_render_plans( $exam ); ?>

		<?php foreach ( $views as $k => $v ) : ?>
			<div class="de-exam-stack"<?php echo $is_omet ? ' data-omet-panel="' . esc_attr( $k ) . '"' . ( $k === $active ? '' : ' hidden' ) : ''; ?>>
				<?php de_render_exam_b( $v, $k === $active ); ?>
			</div>
		<?php endforeach; ?>

		<div class="de-stack-12" data-reveal>
			<span class="de-eyebrow de-eyebrow--muted">EXPLORE MORE</span>
			<div class="de-row de-row--8">
				<?php foreach ( $related as $r ) : ?>
					<a class="de-related" href="<?php echo esc_url( $r[1] ); ?>"><?php de_e( $r[0] ); ?> →</a>
				<?php endforeach; ?>
			</div>
		</div>
	</div>

	<aside class="de-exam-aside">
		<div class="de-price-card">
			<span class="de-eyebrow de-eyebrow--amber de-eyebrow--sm">MOST POPULAR</span>
			<span class="de-price-card__name"><?php de_e( $top['name'] ); ?></span>
			<span class="de-price-card__price"><?php de_e( $top['price'] ); ?></span>
			<ul>
				<?php foreach ( array_slice( $top['feat'], 0, 4 ) as $f ) : ?>
					<li><span aria-hidden="true">✓</span><?php de_e( $f ); ?></li>
				<?php endforeach; ?>
			</ul>
			<a class="de-btn de-btn--amber de-btn--block de-btn--lg" <?php echo de_plan_action( $top, $exam ); // phpcs:ignore ?>><?php de_e( $top['cta'] ); ?></a>
			<span class="de-price-card__note">Unlocks instantly on web and app with your DE Educare ID.</span>
		</div>
		<a class="de-daily-card" href="<?php echo esc_url( $daily ); ?>">
			<span class="de-daily-card__big">5Q</span>
			<span><span class="de-daily-card__t">Today’s free test</span><span class="de-daily-card__d">AI analysis included</span></span>
		</a>
	</aside>
</section>
</div>

<?php
/**
 * Guru live demo: three free preview questions answered by the AI (server-side proxy in inc/guru.php).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$feats = array(
	array( '01', 'Reads your mocks.', 'Topic accuracy, time sinks and skipped-set choices.' ),
	array( '02', 'Solves from a photo.', 'Snap any question from any book.' ),
	array( '03', 'Builds practice sets.', 'From your weakest topics, with questions you haven’t seen.' ),
	array( '04', 'Teaches by voice.', 'Explains a concept step by step, like a tutor beside you.' ),
);
$sugg  = array( 'How should I start CAT prep?', 'Is 85 enough for 99 %ile?', 'CAT or CET first?' );
?>
<section class="de-wrap de-sec-40" id="guru" data-reveal>
	<div class="de-guru">
		<div class="de-guru__copy">
			<span class="de-eyebrow de-eyebrow--amber">GURU · AI STUDY ASSISTANT</span>
			<h2 class="de-h2 de-h2--lg">A tutor on call that has read every mock you’ve taken.</h2>
			<ul class="de-guru__feats">
				<?php foreach ( $feats as $f ) : ?>
					<li><span class="de-guru__n"><?php de_e( $f[0] ); ?></span><span><b><?php de_e( $f[1] ); ?></b> <span class="de-guru__fd"><?php de_e( $f[2] ); ?></span></span></li>
				<?php endforeach; ?>
			</ul>
			<span class="de-guru__note">10 free Guru coins a day · 50 on test series · unlimited on coaching.</span>
		</div>
		<div class="de-chat" data-guru data-signup="<?php echo esc_url( de_signup_url() ); ?>">
			<div class="de-chat__head"><span class="de-orb" aria-hidden="true"></span><span class="de-chat__name">Guru</span><span class="de-chat__left" data-guru-left>3 FREE PREVIEW QUESTIONS</span></div>
			<div class="de-chat__log" data-guru-log aria-live="polite">
				<div class="de-chat__msg">Hi, I'm Guru. Ask me anything about CAT, CET or OMET prep.</div>
			</div>
			<div class="de-chat__sugg">
				<?php foreach ( $sugg as $s ) : ?>
					<button type="button" class="de-chat__chip" data-guru-ask="<?php echo esc_attr( $s ); ?>"><?php de_e( $s ); ?></button>
				<?php endforeach; ?>
			</div>
			<form class="de-chat__form" data-guru-form>
				<label class="screen-reader-text" for="de-guru-q">Ask Guru</label>
				<input id="de-guru-q" name="q" maxlength="300" autocomplete="off" placeholder="Ask about CAT, CET or OMET prep">
				<button type="submit" class="de-chat__send">Ask</button>
			</form>
		</div>
	</div>
</section>

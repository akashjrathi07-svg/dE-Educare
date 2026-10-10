<?php
/**
 * Percentile predictor + college predictor, shown on the home page and on
 * Free resources. The percentile estimate feeds the college predictor.
 * All maths runs in the browser (site.js); data comes from content.php.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/**
 * @param string $id      Anchor id for the block.
 * @param bool   $compact Home page version: shorter intro.
 */
function de_predictors( $id = 'predictor', $compact = false ) {
	$colleges = de_college_data();
	?>
	<div class="de-predict de-anchor" id="<?php echo esc_attr( $id ); ?>" data-predict data-table="<?php echo esc_attr( wp_json_encode( de_percentile_table() ) ); ?>" data-colleges="<?php echo esc_attr( wp_json_encode( $colleges ) ); ?>">
		<div class="de-pred">
			<div class="de-stack-14">
				<span class="de-eyebrow de-eyebrow--muted">STEP 1 · FREE TOOL</span>
				<h2 class="de-pred__h">CAT percentile predictor</h2>
				<?php if ( ! $compact ) : ?>
					<p class="de-p14">Enter your expected marks in each section (+3 per correct, −1 per wrong MCQ). Is 85 enough for 99 percentile? In recent years, roughly yes.</p>
				<?php endif; ?>
				<div class="de-pred__inputs">
					<?php foreach ( array( array( 'VARC', 30 ), array( 'DILR', 18 ), array( 'Quant', 26 ) ) as $in ) : ?>
						<label><?php de_e( $in[0] ); ?><input type="number" inputmode="numeric" min="-30" max="102" value="<?php echo (int) $in[1]; ?>" data-pred-input></label>
					<?php endforeach; ?>
				</div>
				<span class="de-note de-note--xs">Rough estimate from recent score vs percentile trends.</span>
			</div>
			<div class="de-pred__out" aria-live="polite">
				<div><span class="de-pred__k">Score / 204</span><span class="de-pred__v" data-pred-score>74</span></div>
				<div><span class="de-pred__k">Estimated percentile</span><span class="de-pred__v de-pred__v--amber" data-pred-pct>97.6</span></div>
			</div>
		</div>

		<form class="de-cp" data-cp onsubmit="return false">
			<div class="de-cp__in">
				<span class="de-eyebrow de-eyebrow--muted">STEP 2 · FREE TOOL</span>
				<h2 class="de-pred__h">College predictor</h2>
				<?php if ( ! $compact ) : ?>
					<p class="de-p14">Based on your percentile, category and profile. IIMs also weigh academics and work experience, so the predictor adjusts for them.</p>
				<?php endif; ?>
				<div class="de-cp__grid">
					<label class="de-field">Exam
						<select name="exam" data-cp-exam>
							<option value="cat">CAT</option>
							<option value="cet">MAH MBA-CET</option>
						</select>
					</label>
					<label class="de-field">Percentile<input name="pct" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="97.6" data-cp-pct></label>
					<label class="de-field">Category
						<select name="cat" data-cp-cat>
							<option value="general">General</option>
							<option value="ews">EWS</option>
							<option value="obc">OBC-NCL</option>
							<option value="sc">SC</option>
							<option value="st">ST</option>
						</select>
					</label>
					<label class="de-field">10th %<input type="number" inputmode="decimal" min="35" max="100" value="85" data-cp-acad></label>
					<label class="de-field">12th %<input type="number" inputmode="decimal" min="35" max="100" value="80" data-cp-acad></label>
					<label class="de-field">Graduation %<input type="number" inputmode="decimal" min="35" max="100" value="70" data-cp-acad></label>
					<label class="de-field">Work experience (months)<input type="number" inputmode="numeric" min="0" max="120" value="0" data-cp-wx></label>
				</div>
				<span class="de-note de-note--xs">Indicative cutoffs from recent cycles. Real calls depend on the year, the college’s own weightage and interviews.</span>
			</div>
			<div class="de-cp__out" aria-live="polite" data-cp-out>
				<div class="de-cp__band"><span class="de-cp__bh is-good">Good chance</span><ul data-cp-good></ul></div>
				<div class="de-cp__band"><span class="de-cp__bh is-mid">Borderline</span><ul data-cp-mid></ul></div>
				<div class="de-cp__band"><span class="de-cp__bh is-reach">Reach</span><ul data-cp-reach></ul></div>
				<?php de_lead_button( 'counselling', 'Get a free admission counselling call', 'de-btn de-btn--amber de-btn--block' ); ?>
			</div>
		</form>
	</div>
	<?php
}

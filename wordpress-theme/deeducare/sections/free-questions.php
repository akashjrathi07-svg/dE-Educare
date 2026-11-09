<?php
/**
 * Free practice questions with worked solutions (solutions are in the HTML for search engines).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$sets = de_free_questions();
?>
<div class="de-fq de-anchor" id="free-questions" data-fq>
			<div class="de-fq__head">
				<h2 class="de-fq__title">Free questions</h2>
				<div class="de-fq__tabs" role="tablist">
					<?php $first = true; foreach ( $sets as $key => $set ) : ?>
						<button <?php echo de_tab_attrs( 'fq', $key, $first ); // phpcs:ignore ?> class="de-fq__tab"><?php de_e( $set['name'] ); ?></button>
					<?php $first = false; endforeach; ?>
				</div>
			</div>
			<?php $first = true; foreach ( $sets as $key => $set ) : ?>
				<div <?php echo de_panel_attrs( 'fq', $key, $first ); // phpcs:ignore ?> class="de-fq__set" data-fq-set>
					<?php foreach ( $set['qs'] as $i => $q ) : ?>
						<article class="de-fq__q" data-fq-q data-answer="<?php echo (int) $q['a']; ?>"<?php echo 0 === $i ? '' : ' hidden'; ?>>
							<div class="de-fq__meta"><span>Q<?php echo (int) $i + 1; ?> of <?php echo count( $set['qs'] ); ?> · <?php de_e( $q['topic'] ); ?></span><span class="de-blue" data-fq-score>0 / 0 correct</span></div>
							<h3 class="de-fq__text"><?php de_e( $q['q'] ); ?></h3>
							<div class="de-fq__opts">
								<?php foreach ( $q['o'] as $j => $o ) : ?>
									<button type="button" class="de-fq__opt" data-opt="<?php echo (int) $j; ?>"><span class="de-fq__l"><?php echo esc_html( 'ABCD'[ $j ] ); ?></span><span><?php de_e( $o ); ?></span></button>
								<?php endforeach; ?>
							</div>
							<details class="de-fq__sol" data-fq-sol>
								<summary>Worked solution</summary>
								<span class="de-fq__verdict" data-fq-verdict></span>
								<p><?php de_e( $q['sol'] ); ?></p>
							</details>
						</article>
					<?php endforeach; ?>
					<div class="de-fq__nav">
						<button type="button" class="de-btn de-btn--soft" data-fq-prev>← Previous</button>
						<button type="button" class="de-btn de-btn--primary" data-fq-next data-end-toast="Sign in free for 1,000+ more questions">Next →</button>
					</div>
				</div>
			<?php $first = false; endforeach; ?>
		</div>

<?php
/**
 * Helpers that write standard WordPress block markup (headings, paragraphs,
 * buttons, images, lists, tables, FAQ accordions, groups). The page builder
 * uses them to create pages that are fully editable in the block editor.
 *
 * The markup matches what the editor itself saves, so blocks open without
 * "unexpected content" warnings.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** One block: comment delimiters around its HTML. */
function deb( $name, $attrs, $html ) {
	$a = $attrs ? ' ' . serialize_block_attributes( $attrs ) : '';
	return "<!-- wp:{$name}{$a} -->\n{$html}\n<!-- /wp:{$name} -->\n";
}

/** Class attribute text for a block wrapper. */
function deb_class( $base, $extra ) {
	return trim( $base . ' ' . $extra );
}

/** Container (section, div, aside…). */
function deb_group( $inner, $class = '', $tag = 'div', $anchor = '' ) {
	$attrs = array();
	if ( 'div' !== $tag ) {
		$attrs['tagName'] = $tag;
	}
	if ( $anchor ) {
		$attrs['anchor'] = $anchor;
	}
	if ( $class ) {
		$attrs['className'] = $class;
	}
	$id = $anchor ? ' id="' . esc_attr( $anchor ) . '"' : '';
	return deb( 'group', $attrs, '<' . $tag . $id . ' class="' . esc_attr( deb_class( 'wp-block-group', $class ) ) . '">' . $inner . '</' . $tag . '>' );
}

/** Heading. $html may contain inline tags (span, a, strong). */
function deb_heading( $html, $level = 2, $class = '', $anchor = '' ) {
	$attrs = array();
	if ( 2 !== $level ) {
		$attrs['level'] = $level;
	}
	if ( $anchor ) {
		$attrs['anchor'] = $anchor;
	}
	if ( $class ) {
		$attrs['className'] = $class;
	}
	$id = $anchor ? ' id="' . esc_attr( $anchor ) . '"' : '';
	return deb( 'heading', $attrs, "<h{$level}{$id} class=\"" . esc_attr( deb_class( 'wp-block-heading', $class ) ) . "\">{$html}</h{$level}>" );
}

/** Paragraph. $html may contain inline tags. */
function deb_p( $html, $class = '' ) {
	$attrs = $class ? array( 'className' => $class ) : array();
	return deb( 'paragraph', $attrs, ( $class ? '<p class="' . esc_attr( $class ) . '">' : '<p>' ) . $html . '</p>' );
}

/** Escaped text for use inside deb_p / deb_heading. */
function deb_t( $text ) {
	return esc_html( $text );
}

/** Inline link. */
function deb_a( $text, $url ) {
	return '<a href="' . esc_url( $url ) . '">' . esc_html( $text ) . '</a>';
}

/** Bulleted list; items are HTML. */
function deb_list( $items, $class = '' ) {
	$attrs = $class ? array( 'className' => $class ) : array();
	$li    = '';
	foreach ( $items as $it ) {
		$li .= deb( 'list-item', array(), '<li>' . $it . '</li>' );
	}
	return deb( 'list', $attrs, '<ul class="' . esc_attr( deb_class( 'wp-block-list', $class ) ) . '">' . $li . '</ul>' );
}

/**
 * Buttons row. Each button: [ text, url, style ] where style is one of
 * primary, outline, amber, white, ghost, soft (block styles registered by the theme).
 */
function deb_buttons( $buttons, $class = '' ) {
	$inner = '';
	foreach ( $buttons as $b ) {
		$style  = 'is-style-de-' . ( $b[2] ?? 'primary' );
		$inner .= deb( 'button', array( 'className' => $style ), '<div class="' . esc_attr( 'wp-block-button ' . $style ) . '"><a class="wp-block-button__link wp-element-button" href="' . esc_url( $b[1] ) . '">' . esc_html( $b[0] ) . '</a></div>' );
	}
	$attrs = $class ? array( 'className' => $class ) : array();
	return deb( 'buttons', $attrs, '<div class="' . esc_attr( deb_class( 'wp-block-buttons', $class ) ) . '">' . $inner . '</div>' );
}

/** Image from a URL (theme image or media library). */
function deb_image( $url, $alt, $class = '' ) {
	$attrs = array( 'sizeSlug' => 'large', 'linkDestination' => 'none' );
	if ( $class ) {
		$attrs['className'] = $class;
	}
	return deb( 'image', $attrs, '<figure class="' . esc_attr( deb_class( 'wp-block-image size-large', $class ) ) . '"><img src="' . esc_url( $url ) . '" alt="' . esc_attr( $alt ) . '"/></figure>' );
}

/** Table with a header row. Cells are HTML. */
function deb_table( $head, $rows, $class = '' ) {
	$h = '';
	foreach ( $head as $c ) {
		$h .= '<th>' . $c . '</th>';
	}
	$b = '';
	foreach ( $rows as $r ) {
		$b .= '<tr>';
		foreach ( $r as $c ) {
			$b .= '<td>' . $c . '</td>';
		}
		$b .= '</tr>';
	}
	$attrs = $class ? array( 'className' => $class ) : array();
	return deb( 'table', $attrs, '<figure class="' . esc_attr( deb_class( 'wp-block-table', $class ) ) . '"><table class="has-fixed-layout"><thead><tr>' . $h . '</tr></thead><tbody>' . $b . '</tbody></table></figure>' );
}

/** FAQ item: a native <details> accordion with a paragraph answer. */
function deb_faq( $q, $a ) {
	return deb( 'details', array( 'className' => 'de-faq__item' ), '<details class="wp-block-details de-faq__item"><summary>' . esc_html( $q ) . '</summary>' . deb_p( esc_html( $a ) ) . '</details>' );
}

/** FAQ list (also turned into FAQPage structured data by inc/seo.php). */
function deb_faqs( $faqs, $class = 'de-faq' ) {
	$inner = '';
	foreach ( $faqs as $f ) {
		$inner .= deb_faq( $f[0], $f[1] );
	}
	return deb_group( $inner, $class );
}

/** A live DE Educare block (prices, tests, forms, predictors…). */
function deb_live( $name, $exam = '' ) {
	$attrs = array( 'name' => $name );
	if ( $exam ) {
		$attrs['exam'] = $exam;
	}
	return '<!-- wp:deeducare/section ' . serialize_block_attributes( $attrs ) . " /-->\n";
}

/** Small uppercase label above a heading. */
function deb_eyebrow( $text, $tone = 'muted' ) {
	return deb_p( esc_html( $text ), 'de-eyebrow de-eyebrow--' . $tone );
}

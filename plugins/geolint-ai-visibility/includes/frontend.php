<?php
/**
 * What visitors and crawlers see: robots.txt rules, /llms.txt, JSON-LD schema.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function geolint_aiv_options() {
	$stored = get_option( GEOLINT_AIV_OPTION, array() );
	return wp_parse_args( is_array( $stored ) ? $stored : array(), geolint_aiv_default_options() );
}

/* ---------- robots.txt ---------- */

/**
 * WordPress builds robots.txt on the fly only when no physical robots.txt
 * exists. If "Discourage search engines" is on, WordPress already blocks
 * everything, so we leave it alone.
 *
 * @param string     $output Virtual robots.txt.
 * @param string|int $public Value of blog_public.
 */
function geolint_aiv_filter_robots( $output, $public ) {
	if ( '0' === (string) $public ) {
		return $output;
	}
	$options = geolint_aiv_options();
	if ( empty( $options['bots'] ) ) {
		return $output;
	}
	return geolint_aiv_apply_to_robots( $output, $options['bots'] );
}
add_filter( 'robots_txt', 'geolint_aiv_filter_robots', 99, 2 );

/* ---------- llms.txt ---------- */

function geolint_aiv_clean_title( $title ) {
	$title = wp_strip_all_tags( $title );
	return trim( str_replace( array( '[', ']' ), array( '(', ')' ), $title ) );
}

/**
 * Build llms.txt from the site itself: name, tagline, main pages, latest posts.
 */
function geolint_aiv_generate_llms() {
	$cached = get_transient( 'geolint_aiv_llms' );
	if ( is_string( $cached ) && '' !== $cached ) {
		return $cached;
	}

	$name = geolint_aiv_clean_title( get_bloginfo( 'name' ) );
	$desc = trim( wp_strip_all_tags( get_bloginfo( 'description' ) ) );
	$out  = '# ' . ( '' !== $name ? $name : wp_parse_url( home_url(), PHP_URL_HOST ) ) . "\n\n";
	if ( '' !== $desc ) {
		$out .= '> ' . $desc . "\n\n";
	}

	$skip  = array_filter( array( (int) get_option( 'page_on_front' ), (int) get_option( 'wp_page_for_privacy_policy' ) ) );
	$pages = get_pages( array( 'sort_column' => 'menu_order,post_title', 'post_status' => 'publish', 'number' => 30 ) );
	$lines = array();
	foreach ( $pages as $page ) {
		if ( in_array( (int) $page->ID, $skip, true ) || ! empty( $page->post_password ) ) {
			continue;
		}
		$lines[] = geolint_aiv_llms_line( $page );
	}
	if ( $lines ) {
		$out .= "## Pages\n" . implode( "\n", $lines ) . "\n\n";
	}

	$posts = get_posts( array( 'numberposts' => 10, 'post_status' => 'publish', 'suppress_filters' => false ) );
	$lines = array();
	foreach ( $posts as $post ) {
		if ( ! empty( $post->post_password ) ) {
			continue;
		}
		$lines[] = geolint_aiv_llms_line( $post );
	}
	if ( $lines ) {
		$out .= "## Latest posts\n" . implode( "\n", $lines ) . "\n\n";
	}

	$out = rtrim( $out ) . "\n";
	set_transient( 'geolint_aiv_llms', $out, 12 * HOUR_IN_SECONDS );
	return $out;
}

function geolint_aiv_llms_line( $post ) {
	$text = $post->post_excerpt ? $post->post_excerpt : $post->post_content;
	$text = trim( wp_trim_words( wp_strip_all_tags( strip_shortcodes( $text ) ), 22, '' ) );
	$line = '- [' . geolint_aiv_clean_title( get_the_title( $post ) ) . '](' . get_permalink( $post ) . ')';
	return '' !== $text ? $line . ': ' . $text : $line;
}

function geolint_aiv_llms_body() {
	$options = geolint_aiv_options();
	if ( 'custom' === $options['llms_mode'] && '' !== trim( $options['llms_custom'] ) ) {
		return rtrim( $options['llms_custom'] ) . "\n";
	}
	return geolint_aiv_generate_llms();
}

/**
 * Serve /llms.txt. If a real llms.txt file exists in the web root the web
 * server answers first and this never runs (the settings page warns about it).
 */
function geolint_aiv_maybe_serve_llms() {
	$options = geolint_aiv_options();
	if ( empty( $options['llms_enabled'] ) || empty( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}
	$wanted  = wp_parse_url( home_url( '/llms.txt' ), PHP_URL_PATH );
	$request = wp_parse_url( esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH );
	if ( $request !== $wanted ) {
		return;
	}

	status_header( 200 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'Cache-Control: public, max-age=3600' );
	echo geolint_aiv_llms_body(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain text file.
	exit;
}
add_action( 'init', 'geolint_aiv_maybe_serve_llms', 1 );

function geolint_aiv_clear_llms_cache() {
	delete_transient( 'geolint_aiv_llms' );
}
add_action( 'save_post', 'geolint_aiv_clear_llms_cache' );
add_action( 'deleted_post', 'geolint_aiv_clear_llms_cache' );
add_action( 'update_option_blogname', 'geolint_aiv_clear_llms_cache' );
add_action( 'update_option_blogdescription', 'geolint_aiv_clear_llms_cache' );

/* ---------- schema ---------- */

/** True when an SEO plugin that already prints Organization schema is active. */
function geolint_aiv_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' );
}

function geolint_aiv_output_schema() {
	if ( ! is_front_page() ) {
		return;
	}
	$options = geolint_aiv_options();
	if ( empty( $options['schema_enabled'] ) ) {
		return;
	}

	$home = home_url( '/' );
	$name = '' !== $options['org_name'] ? $options['org_name'] : wp_strip_all_tags( get_bloginfo( 'name' ) );
	$org  = array(
		'@type' => 'Organization',
		'@id'   => $home . '#organization',
		'name'  => $name,
		'url'   => $home,
	);
	if ( '' !== $options['org_logo'] ) {
		$org['logo'] = $options['org_logo'];
	}
	if ( '' !== $options['org_description'] ) {
		$org['description'] = $options['org_description'];
	}
	$same_as = array_filter( array_map( 'trim', explode( "\n", (string) $options['same_as'] ) ) );
	if ( $same_as ) {
		$org['sameAs'] = array_values( $same_as );
	}

	$site = array(
		'@type'     => 'WebSite',
		'@id'       => $home . '#website',
		'url'       => $home,
		'name'      => wp_strip_all_tags( get_bloginfo( 'name' ) ),
		'publisher' => array( '@id' => $home . '#organization' ),
	);

	$json = wp_json_encode(
		array( '@context' => 'https://schema.org', '@graph' => array( $org, $site ) ),
		JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG
	);
	echo '<script type="application/ld+json">' . $json . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON with JSON_HEX_TAG.
}
add_action( 'wp_head', 'geolint_aiv_output_schema', 5 );

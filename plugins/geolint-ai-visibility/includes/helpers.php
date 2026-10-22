<?php
/**
 * Pure helpers: option defaults, the crawler list, robots.txt parsing and
 * rewriting. Nothing here calls WordPress at load time.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * AI crawlers GeoLint reports on. Key = the exact user-agent token used in robots.txt.
 *
 * @return array<string,array{label:string,vendor:string,purpose:string}>
 */
function geolint_aiv_bots() {
	return array(
		'OAI-SearchBot'       => array( 'label' => 'OAI-SearchBot', 'vendor' => 'OpenAI', 'purpose' => 'Search: lets ChatGPT search show and cite your pages' ),
		'ChatGPT-User'        => array( 'label' => 'ChatGPT-User', 'vendor' => 'OpenAI', 'purpose' => 'User action: fetches a page when a ChatGPT user asks about it' ),
		'GPTBot'              => array( 'label' => 'GPTBot', 'vendor' => 'OpenAI', 'purpose' => 'Training: collects content to train OpenAI models' ),
		'Claude-SearchBot'    => array( 'label' => 'Claude-SearchBot', 'vendor' => 'Anthropic', 'purpose' => 'Search: improves search result quality in Claude' ),
		'Claude-User'         => array( 'label' => 'Claude-User', 'vendor' => 'Anthropic', 'purpose' => 'User action: fetches a page when a Claude user asks about it' ),
		'ClaudeBot'           => array( 'label' => 'ClaudeBot', 'vendor' => 'Anthropic', 'purpose' => 'Training: collects content to train Claude models' ),
		'PerplexityBot'       => array( 'label' => 'PerplexityBot', 'vendor' => 'Perplexity', 'purpose' => 'Search: indexes pages for Perplexity answers' ),
		'Perplexity-User'     => array( 'label' => 'Perplexity-User', 'vendor' => 'Perplexity', 'purpose' => 'User action: fetches a page when a Perplexity user asks about it' ),
		'Google-Extended'     => array( 'label' => 'Google-Extended', 'vendor' => 'Google', 'purpose' => 'Control token: allows or blocks use of your content for Gemini AI' ),
		'Applebot-Extended'   => array( 'label' => 'Applebot-Extended', 'vendor' => 'Apple', 'purpose' => 'Control token: allows or blocks use of your content for Apple AI' ),
		'CCBot'               => array( 'label' => 'CCBot', 'vendor' => 'Common Crawl', 'purpose' => 'Open web archive that many AI models train on' ),
		'Meta-ExternalAgent'  => array( 'label' => 'Meta-ExternalAgent', 'vendor' => 'Meta', 'purpose' => 'Training: collects content for Meta AI models' ),
	);
}

/** Bots a "recommended" preset allows: the ones that let AI tools find and cite you. */
function geolint_aiv_recommended_allow() {
	return array( 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User' );
}

/**
 * The settings "Apply recommended fixes" saves, built on top of what the owner already chose:
 * allow the search and answer crawlers that are still on "leave as is", serve llms.txt, and add
 * Organization schema (unless an SEO plugin already prints it). Nothing the owner set is overwritten.
 *
 * @param array $current Current stored options.
 * @return array Options in the stored shape.
 */
function geolint_aiv_recommended_options( $current ) {
	$new = is_array( $current ) ? $current : array();
	$new = array_merge( geolint_aiv_default_options(), $new );

	$bots = isset( $new['bots'] ) && is_array( $new['bots'] ) ? $new['bots'] : array();
	foreach ( geolint_aiv_recommended_allow() as $agent ) {
		if ( ! isset( $bots[ $agent ] ) ) {
			$bots[ $agent ] = 'allow';
		}
	}
	$new['bots']         = $bots;
	$new['llms_enabled'] = 1;

	if ( function_exists( 'geolint_aiv_seo_plugin_active' ) && geolint_aiv_seo_plugin_active() ) {
		$new['schema_enabled'] = empty( $new['schema_enabled'] ) ? 0 : 1;
	} else {
		$new['schema_enabled'] = 1;
	}

	if ( '' === (string) $new['org_name'] ) {
		$new['org_name'] = wp_strip_all_tags( (string) get_bloginfo( 'name' ) );
	}
	if ( '' === (string) $new['org_description'] ) {
		$new['org_description'] = wp_strip_all_tags( (string) get_bloginfo( 'description' ) );
	}
	if ( '' === (string) $new['org_logo'] ) {
		$icon = function_exists( 'get_site_icon_url' ) ? get_site_icon_url( 512 ) : '';
		$new['org_logo'] = is_string( $icon ) ? $icon : '';
	}

	return geolint_aiv_clean_options( $new );
}

function geolint_aiv_default_options() {
	return array(
		'bots'           => array(),
		'llms_enabled'   => 0,
		'llms_mode'      => 'auto',
		'llms_custom'    => '',
		'schema_enabled' => 0,
		'org_name'       => '',
		'org_logo'       => '',
		'org_description' => '',
		'same_as'        => '',
	);
}

/**
 * Reduce raw input to the stored shape. Unknown bots and unknown choices are dropped.
 *
 * @param mixed $input Raw posted array.
 * @return array
 */
function geolint_aiv_clean_options( $input ) {
	$input    = is_array( $input ) ? $input : array();
	$clean    = geolint_aiv_default_options();
	$known    = geolint_aiv_bots();
	$choices  = array( 'allow', 'block' );
	$raw_bots = isset( $input['bots'] ) && is_array( $input['bots'] ) ? $input['bots'] : array();

	foreach ( $raw_bots as $agent => $choice ) {
		if ( isset( $known[ $agent ] ) && in_array( $choice, $choices, true ) ) {
			$clean['bots'][ $agent ] = $choice;
		}
	}

	$clean['llms_enabled']    = empty( $input['llms_enabled'] ) ? 0 : 1;
	$clean['llms_mode']       = ( isset( $input['llms_mode'] ) && 'custom' === $input['llms_mode'] ) ? 'custom' : 'auto';
	$clean['llms_custom']     = isset( $input['llms_custom'] ) ? geolint_aiv_text( $input['llms_custom'] ) : '';
	$clean['schema_enabled']  = empty( $input['schema_enabled'] ) ? 0 : 1;
	$clean['org_name']        = isset( $input['org_name'] ) ? trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $input['org_name'] ) ) ) : '';
	$clean['org_description'] = isset( $input['org_description'] ) ? trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $input['org_description'] ) ) ) : '';
	$clean['org_logo']        = isset( $input['org_logo'] ) ? geolint_aiv_url( $input['org_logo'] ) : '';

	$urls = array();
	if ( isset( $input['same_as'] ) ) {
		foreach ( preg_split( '/\r\n|\r|\n/', (string) $input['same_as'] ) as $line ) {
			$url = geolint_aiv_url( $line );
			if ( '' !== $url ) {
				$urls[] = $url;
			}
		}
	}
	$clean['same_as'] = implode( "\n", array_slice( array_unique( $urls ), 0, 12 ) );

	return $clean;
}

/** Plain text with newlines kept, tags removed. */
function geolint_aiv_text( $value ) {
	$value = str_replace( array( "\r\n", "\r" ), "\n", (string) $value );
	return trim( wp_strip_all_tags( $value ) );
}

/** Only http(s) URLs pass. */
function geolint_aiv_url( $value ) {
	$value = trim( (string) $value );
	if ( '' === $value || ! preg_match( '#^https?://[^\s<>"\']+$#i', $value ) ) {
		return '';
	}
	return $value;
}

/**
 * Parse robots.txt into groups. Sitemap lines are global and ignored here.
 *
 * @param string $txt robots.txt contents.
 * @return array<int,array{agents:string[],rules:array<int,array{0:string,1:string}>}>
 */
function geolint_aiv_parse_robots( $txt ) {
	$groups  = array();
	$current = null;
	$in_uas  = false;

	foreach ( preg_split( '/\r\n|\r|\n/', (string) $txt ) as $line ) {
		$line = trim( preg_replace( '/#.*$/', '', $line ) );
		if ( '' === $line || false === strpos( $line, ':' ) ) {
			continue;
		}
		list( $field, $value ) = array_map( 'trim', explode( ':', $line, 2 ) );
		$field = strtolower( $field );

		if ( 'user-agent' === $field ) {
			if ( ! $in_uas || null === $current ) {
				$groups[] = array( 'agents' => array(), 'rules' => array() );
				$current  = count( $groups ) - 1;
			}
			$groups[ $current ]['agents'][] = strtolower( $value );
			$in_uas                         = true;
		} elseif ( 'allow' === $field || 'disallow' === $field ) {
			if ( null !== $current ) {
				$groups[ $current ]['rules'][] = array( $field, $value );
			}
			$in_uas = false;
		}
	}

	return $groups;
}

/**
 * What robots.txt says to one crawler: the group naming it, else the "*" group.
 *
 * @return array{state:string,source:string} state: allowed | blocked | partial.
 */
function geolint_aiv_robots_status( $txt, $agent ) {
	$groups = geolint_aiv_parse_robots( $txt );
	$agent  = strtolower( $agent );
	$match  = null;
	$source = 'none';

	foreach ( $groups as $group ) {
		if ( in_array( $agent, $group['agents'], true ) ) {
			$match  = $group;
			$source = 'bot';
			break;
		}
	}
	if ( null === $match ) {
		foreach ( $groups as $group ) {
			if ( in_array( '*', $group['agents'], true ) ) {
				$match  = $group;
				$source = '*';
				break;
			}
		}
	}
	if ( null === $match ) {
		return array( 'state' => 'allowed', 'source' => 'none' );
	}

	$disallow_all = false;
	$allow_all    = false;
	$partial      = false;
	foreach ( $match['rules'] as $rule ) {
		if ( 'disallow' === $rule[0] ) {
			if ( '/' === $rule[1] ) {
				$disallow_all = true;
			} elseif ( '' !== $rule[1] ) {
				$partial = true;
			}
		} elseif ( '/' === $rule[1] || '' === $rule[1] ) {
			$allow_all = true;
		}
	}

	if ( $disallow_all && ! $allow_all ) {
		return array( 'state' => 'blocked', 'source' => $source );
	}
	if ( $partial || $disallow_all ) {
		return array( 'state' => 'partial', 'source' => $source );
	}
	return array( 'state' => 'allowed', 'source' => $source );
}

/**
 * Remove the named crawlers from existing robots.txt output so the rules we
 * add are the only ones that apply to them. A group shared with other
 * crawlers keeps those crawlers and their rules.
 *
 * @param string   $txt    Existing robots.txt.
 * @param string[] $agents Crawler tokens to remove.
 * @return string
 */
function geolint_aiv_strip_agents( $txt, $agents ) {
	$drop  = array_map( 'strtolower', $agents );
	$items = array(); // Each item: array('type'=>'line'|'group', ...).
	$cur   = null;
	$in_ua = false;

	foreach ( preg_split( '/\r\n|\r|\n/', (string) $txt ) as $raw ) {
		$clean = trim( preg_replace( '/#.*$/', '', $raw ) );
		$field = '';
		$value = '';
		if ( '' !== $clean && false !== strpos( $clean, ':' ) ) {
			list( $field, $value ) = array_map( 'trim', explode( ':', $clean, 2 ) );
			$field                 = strtolower( $field );
		}

		if ( 'user-agent' === $field ) {
			if ( ! $in_ua || null === $cur ) {
				$items[] = array( 'type' => 'group', 'uas' => array(), 'rules' => array() );
				$cur     = count( $items ) - 1;
			}
			$items[ $cur ]['uas'][] = array( trim( $raw ), strtolower( $value ) );
			$in_ua                  = true;
		} elseif ( 'allow' === $field || 'disallow' === $field || 'crawl-delay' === $field ) {
			if ( null !== $cur ) {
				$items[ $cur ]['rules'][] = trim( $raw );
			} else {
				$items[] = array( 'type' => 'line', 'text' => $raw );
			}
			$in_ua = false;
		} else {
			// Sitemap, comments, blank lines: kept in place; they do not end a group.
			$items[] = array( 'type' => 'line', 'text' => $raw );
			if ( 'sitemap' !== $field && '' !== $clean ) {
				$cur   = null;
				$in_ua = false;
			}
		}
	}

	$out = array();
	foreach ( $items as $item ) {
		if ( 'line' === $item['type'] ) {
			$out[] = $item['text'];
			continue;
		}
		$keep = array();
		foreach ( $item['uas'] as $ua ) {
			if ( ! in_array( $ua[1], $drop, true ) ) {
				$keep[] = $ua[0];
			}
		}
		if ( $keep ) {
			$out = array_merge( $out, $keep, $item['rules'] );
		}
	}

	return trim( preg_replace( "/\n{3,}/", "\n\n", implode( "\n", $out ) ) );
}

/**
 * The block of rules to append for the chosen bots.
 *
 * @param array<string,string> $choices Agent => 'allow'|'block'.
 * @return string Empty when nothing is chosen.
 */
function geolint_aiv_rules_block( $choices ) {
	$known  = geolint_aiv_bots();
	$blocks = array();
	foreach ( $choices as $agent => $choice ) {
		if ( ! isset( $known[ $agent ] ) ) {
			continue;
		}
		if ( 'allow' === $choice ) {
			$blocks[] = "User-agent: {$agent}\nAllow: /";
		} elseif ( 'block' === $choice ) {
			$blocks[] = "User-agent: {$agent}\nDisallow: /";
		}
	}
	return $blocks ? "# Added by GeoLint AI Visibility\n" . implode( "\n\n", $blocks ) : '';
}

/**
 * Final robots.txt: existing output minus the chosen bots, plus our rules.
 */
function geolint_aiv_apply_to_robots( $existing, $choices ) {
	$block = geolint_aiv_rules_block( $choices );
	if ( '' === $block ) {
		return $existing;
	}
	$base = geolint_aiv_strip_agents( $existing, array_keys( $choices ) );
	return ( '' === $base ? '' : $base . "\n\n" ) . $block . "\n";
}

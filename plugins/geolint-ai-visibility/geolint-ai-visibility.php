<?php
/**
 * Plugin Name:       GeoLint AI Visibility
 * Plugin URI:        https://nexorasolution.us/tools/geo-audit/
 * Description:       Apply the fixes a GeoLint audit finds: robots.txt rules for AI crawlers, an llms.txt file, and Organization/WebSite schema, from one settings page.
 * Version:           1.1.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Nexora Solution
 * Author URI:        https://nexorasolution.us/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       geolint-ai-visibility
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GEOLINT_AIV_VERSION', '1.1.0' );
define( 'GEOLINT_AIV_FILE', __FILE__ );
define( 'GEOLINT_AIV_OPTION', 'geolint_aiv_options' );
define( 'GEOLINT_AIV_AUDIT_URL', 'https://nexorasolution.us/tools/geo-audit/' );

require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/frontend.php';

if ( is_admin() ) {
	require_once __DIR__ . '/includes/admin.php';
}

/**
 * Nothing changes on a site until the owner saves settings: every feature
 * starts switched off. The one default we pick is to leave schema off when
 * an SEO plugin already prints it, to avoid duplicate markup.
 */
function geolint_aiv_activate() {
	if ( false === get_option( GEOLINT_AIV_OPTION, false ) ) {
		$defaults                   = geolint_aiv_default_options();
		$defaults['schema_enabled'] = 0;
		add_option( GEOLINT_AIV_OPTION, $defaults, '', false );
	}
	// Send the person who activated the plugin to the settings page, where one click applies the fixes.
	set_transient( 'geolint_aiv_welcome', 1, 60 );
}
register_activation_hook( __FILE__, 'geolint_aiv_activate' );

function geolint_aiv_deactivate() {
	delete_transient( 'geolint_aiv_llms' );
}
register_deactivation_hook( __FILE__, 'geolint_aiv_deactivate' );

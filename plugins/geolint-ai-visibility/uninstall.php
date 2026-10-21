<?php
/**
 * Removes everything the plugin stored. The robots.txt rules, llms.txt and
 * schema stop being served as soon as the plugin is deactivated.
 */
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'geolint_aiv_options' );
delete_transient( 'geolint_aiv_llms' );

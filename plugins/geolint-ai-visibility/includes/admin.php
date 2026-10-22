<?php
/**
 * Settings page: Settings -> GeoLint AI Visibility.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function geolint_aiv_admin_menu() {
	add_options_page(
		__( 'GeoLint AI Visibility', 'geolint-ai-visibility' ),
		__( 'GeoLint AI Visibility', 'geolint-ai-visibility' ),
		'manage_options',
		'geolint-ai-visibility',
		'geolint_aiv_render_page'
	);
}
add_action( 'admin_menu', 'geolint_aiv_admin_menu' );

function geolint_aiv_settings_url( $args = array() ) {
	return add_query_arg( $args, admin_url( 'options-general.php?page=geolint-ai-visibility' ) );
}

/** After activation, open the settings page once (not for bulk or network activation). */
function geolint_aiv_welcome_redirect() {
	if ( ! get_transient( 'geolint_aiv_welcome' ) ) {
		return;
	}
	delete_transient( 'geolint_aiv_welcome' );
	if ( wp_doing_ajax() || is_network_admin() || isset( $_GET['activate-multi'] ) || ! current_user_can( 'manage_options' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only checks whether this is a bulk activation.
		return;
	}
	wp_safe_redirect( geolint_aiv_settings_url( array( 'welcome' => '1' ) ) );
	exit;
}
add_action( 'admin_init', 'geolint_aiv_welcome_redirect' );

/** "Apply recommended fixes" button: saves the recommended settings, then returns to the settings page. */
function geolint_aiv_handle_apply() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to change these settings.', 'geolint-ai-visibility' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'geolint_aiv_apply' );
	update_option( GEOLINT_AIV_OPTION, geolint_aiv_recommended_options( get_option( GEOLINT_AIV_OPTION, array() ) ), false );
	delete_transient( 'geolint_aiv_llms' );
	wp_safe_redirect( geolint_aiv_settings_url( array( 'applied' => '1' ) ) );
	exit;
}
add_action( 'admin_post_geolint_aiv_apply', 'geolint_aiv_handle_apply' );

function geolint_aiv_register_settings() {
	register_setting(
		'geolint_aiv',
		GEOLINT_AIV_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'geolint_aiv_sanitize_option',
			'default'           => geolint_aiv_default_options(),
		)
	);
}
add_action( 'admin_init', 'geolint_aiv_register_settings' );

function geolint_aiv_sanitize_option( $input ) {
	delete_transient( 'geolint_aiv_llms' );
	return geolint_aiv_clean_options( $input );
}

function geolint_aiv_plugin_action_links( $links ) {
	$url = admin_url( 'options-general.php?page=geolint-ai-visibility' );
	array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'geolint-ai-visibility' ) . '</a>' );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( GEOLINT_AIV_FILE ), 'geolint_aiv_plugin_action_links' );

/** Fetch one of the site's own files over HTTP, the way a crawler would. */
function geolint_aiv_fetch_own( $path ) {
	$response = wp_remote_get( home_url( $path ), array( 'timeout' => 8, 'redirection' => 3, 'user-agent' => 'GeoLint-AI-Visibility/' . GEOLINT_AIV_VERSION ) );
	if ( is_wp_error( $response ) ) {
		return array( 'ok' => false, 'error' => $response->get_error_message(), 'body' => '' );
	}
	return array(
		'ok'   => 200 === (int) wp_remote_retrieve_response_code( $response ),
		'code' => (int) wp_remote_retrieve_response_code( $response ),
		'body' => (string) wp_remote_retrieve_body( $response ),
		'type' => (string) wp_remote_retrieve_header( $response, 'content-type' ),
	);
}

function geolint_aiv_state_label( $state ) {
	$labels = array(
		'allowed' => array( __( 'Allowed', 'geolint-ai-visibility' ), '#1a7f37' ),
		'blocked' => array( __( 'Blocked', 'geolint-ai-visibility' ), '#b42318' ),
		'partial' => array( __( 'Partly blocked', 'geolint-ai-visibility' ), '#b54708' ),
	);
	$item   = isset( $labels[ $state ] ) ? $labels[ $state ] : $labels['allowed'];
	return '<strong style="color:' . esc_attr( $item[1] ) . '">' . esc_html( $item[0] ) . '</strong>';
}

function geolint_aiv_render_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$options  = geolint_aiv_options();
	$bots     = geolint_aiv_bots();
	$name     = GEOLINT_AIV_OPTION;
	$checked  = isset( $_GET['geolint_check'] ) && check_admin_referer( 'geolint_check' ); // phpcs:ignore WordPress.Security.NonceVerification -- verified by check_admin_referer.
	$robots   = $checked ? geolint_aiv_fetch_own( '/robots.txt' ) : null;
	$llms     = $checked ? geolint_aiv_fetch_own( '/llms.txt' ) : null;
	$phys_rb  = file_exists( ABSPATH . 'robots.txt' );
	$phys_llm = file_exists( ABSPATH . 'llms.txt' );
	$blocked  = '0' === (string) get_option( 'blog_public' );
	$applied   = isset( $_GET['applied'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only, changes nothing.
	$pristine  = empty( $options['llms_enabled'] ) && empty( $options['schema_enabled'] ) && empty( $options['bots'] );
	$show_apply = isset( $_GET['welcome'] ) || $pristine; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
	$check_url = wp_nonce_url( admin_url( 'options-general.php?page=geolint-ai-visibility&geolint_check=1' ), 'geolint_check' );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'GeoLint AI Visibility', 'geolint-ai-visibility' ); ?></h1>
		<p><?php esc_html_e( 'Apply the fixes a GeoLint audit finds: tell AI crawlers what they may read, publish an llms.txt file, and add Organization schema. Nothing changes on your site until you save.', 'geolint-ai-visibility' ); ?>
			<a href="<?php echo esc_url( GEOLINT_AIV_AUDIT_URL ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Run the free GeoLint audit', 'geolint-ai-visibility' ); ?></a></p>

		<?php if ( $applied ) : ?>
			<div class="notice notice-success"><p><strong><?php esc_html_e( 'Recommended fixes applied.', 'geolint-ai-visibility' ); ?></strong>
				<?php esc_html_e( 'AI search and answer crawlers are allowed, llms.txt is on, and Organization schema is on (unless an SEO plugin already prints it).', 'geolint-ai-visibility' ); ?>
				<a href="<?php echo esc_url( home_url( '/llms.txt' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'View llms.txt', 'geolint-ai-visibility' ); ?></a> |
				<a href="<?php echo esc_url( $check_url ); ?>"><?php esc_html_e( 'Check my site now', 'geolint-ai-visibility' ); ?></a></p></div>
		<?php elseif ( $show_apply ) : ?>
			<div class="card" style="max-width:780px;border-left:4px solid #2271b1;padding:16px 20px;">
				<h2 style="margin-top:0;"><?php esc_html_e( 'Fix your site in one click', 'geolint-ai-visibility' ); ?></h2>
				<p><?php esc_html_e( 'This applies the fixes a GeoLint audit usually finds. You can change everything below afterwards.', 'geolint-ai-visibility' ); ?></p>
				<ul style="list-style:disc;margin-left:20px;">
					<li><?php esc_html_e( 'Allow the AI search and answer crawlers (ChatGPT, Claude, Perplexity) in robots.txt.', 'geolint-ai-visibility' ); ?></li>
					<li><?php esc_html_e( 'Serve an llms.txt file made from your site name, pages and latest posts.', 'geolint-ai-visibility' ); ?></li>
					<li><?php esc_html_e( 'Add Organization and WebSite schema to your home page (skipped if an SEO plugin already does it).', 'geolint-ai-visibility' ); ?></li>
				</ul>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="geolint_aiv_apply" />
					<?php wp_nonce_field( 'geolint_aiv_apply' ); ?>
					<?php submit_button( __( 'Apply recommended fixes', 'geolint-ai-visibility' ), 'primary large', 'submit', false ); ?>
				</form>
			</div>
		<?php endif; ?>

		<?php if ( $blocked ) : ?>
			<div class="notice notice-warning"><p><?php esc_html_e( 'Settings > Reading has "Discourage search engines from indexing this site" turned on. WordPress then blocks all crawlers in robots.txt, so the crawler rules below are not applied until you turn that off.', 'geolint-ai-visibility' ); ?></p></div>
		<?php endif; ?>
		<?php if ( $phys_rb ) : ?>
			<div class="notice notice-warning"><p><?php esc_html_e( 'A real robots.txt file exists in your site folder, so WordPress cannot edit it. Copy the rules shown under "Rules to paste" into that file, or delete the file to let this plugin manage robots.txt.', 'geolint-ai-visibility' ); ?></p></div>
		<?php endif; ?>
		<?php if ( $phys_llm ) : ?>
			<div class="notice notice-warning"><p><?php esc_html_e( 'A real llms.txt file exists in your site folder and is served instead of the one made here. Delete it to use this plugin.', 'geolint-ai-visibility' ); ?></p></div>
		<?php endif; ?>

		<form method="post" action="options.php">
			<?php settings_fields( 'geolint_aiv' ); ?>

			<h2><?php esc_html_e( '1. AI crawler access (robots.txt)', 'geolint-ai-visibility' ); ?></h2>
			<p><?php esc_html_e( 'Choose, for each AI crawler, whether to allow it, block it, or leave your current robots.txt as it is. Search and user-action crawlers decide whether AI tools can find and cite you; training crawlers only affect model training.', 'geolint-ai-visibility' ); ?></p>
			<p><button type="button" class="button" id="geolint-recommended"><?php esc_html_e( 'Allow AI search and answer crawlers (recommended)', 'geolint-ai-visibility' ); ?></button></p>
			<table class="widefat striped" style="max-width:980px">
				<thead><tr>
					<th><?php esc_html_e( 'Crawler', 'geolint-ai-visibility' ); ?></th>
					<th><?php esc_html_e( 'What it does', 'geolint-ai-visibility' ); ?></th>
					<th><?php esc_html_e( 'Setting', 'geolint-ai-visibility' ); ?></th>
					<?php if ( $robots ) : ?><th><?php esc_html_e( 'Current robots.txt', 'geolint-ai-visibility' ); ?></th><?php endif; ?>
				</tr></thead>
				<tbody>
				<?php foreach ( $bots as $agent => $bot ) : $choice = isset( $options['bots'][ $agent ] ) ? $options['bots'][ $agent ] : ''; ?>
					<tr>
						<td><code><?php echo esc_html( $agent ); ?></code><br><span class="description"><?php echo esc_html( $bot['vendor'] ); ?></span></td>
						<td><?php echo esc_html( $bot['purpose'] ); ?></td>
						<td>
							<select name="<?php echo esc_attr( $name ); ?>[bots][<?php echo esc_attr( $agent ); ?>]" data-agent="<?php echo esc_attr( $agent ); ?>">
								<option value="" <?php selected( $choice, '' ); ?>><?php esc_html_e( 'Leave as is', 'geolint-ai-visibility' ); ?></option>
								<option value="allow" <?php selected( $choice, 'allow' ); ?>><?php esc_html_e( 'Allow', 'geolint-ai-visibility' ); ?></option>
								<option value="block" <?php selected( $choice, 'block' ); ?>><?php esc_html_e( 'Block', 'geolint-ai-visibility' ); ?></option>
							</select>
						</td>
						<?php if ( $robots ) :
							$status = $robots['ok'] ? geolint_aiv_robots_status( $robots['body'], $agent ) : null; ?>
							<td><?php echo $status ? geolint_aiv_state_label( $status['state'] ) : esc_html__( 'Could not read', 'geolint-ai-visibility' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in helper. ?></td>
						<?php endif; ?>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<?php $rules = geolint_aiv_rules_block( $options['bots'] ); if ( '' !== $rules ) : ?>
				<p><strong><?php esc_html_e( 'Rules to paste', 'geolint-ai-visibility' ); ?></strong> <span class="description"><?php esc_html_e( '(only needed if you manage robots.txt as a real file)', 'geolint-ai-visibility' ); ?></span></p>
				<textarea readonly rows="6" class="large-text code" style="max-width:520px"><?php echo esc_textarea( $rules ); ?></textarea>
			<?php endif; ?>

			<h2><?php esc_html_e( '2. llms.txt', 'geolint-ai-visibility' ); ?></h2>
			<p><?php esc_html_e( 'llms.txt is a plain-text summary of your site written for AI tools, served at /llms.txt. It is a proposed convention: it helps AI tools understand your site, but no AI company guarantees it changes your results.', 'geolint-ai-visibility' ); ?></p>
			<p><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[llms_enabled]" value="1" <?php checked( $options['llms_enabled'], 1 ); ?>> <?php esc_html_e( 'Serve /llms.txt', 'geolint-ai-visibility' ); ?></label></p>
			<p>
				<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[llms_mode]" value="auto" <?php checked( $options['llms_mode'], 'auto' ); ?>> <?php esc_html_e( 'Generate from my site (name, tagline, pages, latest posts)', 'geolint-ai-visibility' ); ?></label><br>
				<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[llms_mode]" value="custom" <?php checked( $options['llms_mode'], 'custom' ); ?>> <?php esc_html_e( 'Use my own text', 'geolint-ai-visibility' ); ?></label>
			</p>
			<textarea name="<?php echo esc_attr( $name ); ?>[llms_custom]" rows="10" class="large-text code" style="max-width:720px" placeholder="# My Site&#10;&#10;> One sentence about what the site is.&#10;&#10;## Pages&#10;- [About](https://example.com/about/): who we are"><?php echo esc_textarea( $options['llms_custom'] ); ?></textarea>
			<p class="description"><?php esc_html_e( 'Preview of the automatic version:', 'geolint-ai-visibility' ); ?></p>
			<textarea readonly rows="8" class="large-text code" style="max-width:720px"><?php echo esc_textarea( geolint_aiv_generate_llms() ); ?></textarea>

			<h2><?php esc_html_e( '3. Organization schema', 'geolint-ai-visibility' ); ?></h2>
			<?php if ( geolint_aiv_seo_plugin_active() ) : ?>
				<div class="notice notice-info inline"><p><?php esc_html_e( 'An SEO plugin is active and probably already prints Organization schema. Turning this on as well can create duplicate markup, so leave it off unless your audit says the schema is missing.', 'geolint-ai-visibility' ); ?></p></div>
			<?php endif; ?>
			<p><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[schema_enabled]" value="1" <?php checked( $options['schema_enabled'], 1 ); ?>> <?php esc_html_e( 'Add Organization and WebSite JSON-LD to the home page', 'geolint-ai-visibility' ); ?></label></p>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="geolint-org-name"><?php esc_html_e( 'Organization name', 'geolint-ai-visibility' ); ?></label></th>
					<td><input id="geolint-org-name" class="regular-text" type="text" name="<?php echo esc_attr( $name ); ?>[org_name]" value="<?php echo esc_attr( $options['org_name'] ); ?>" placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"></td></tr>
				<tr><th scope="row"><label for="geolint-org-logo"><?php esc_html_e( 'Logo URL', 'geolint-ai-visibility' ); ?></label></th>
					<td><input id="geolint-org-logo" class="regular-text" type="url" name="<?php echo esc_attr( $name ); ?>[org_logo]" value="<?php echo esc_attr( $options['org_logo'] ); ?>" placeholder="https://"></td></tr>
				<tr><th scope="row"><label for="geolint-org-desc"><?php esc_html_e( 'Description', 'geolint-ai-visibility' ); ?></label></th>
					<td><textarea id="geolint-org-desc" class="large-text" rows="3" name="<?php echo esc_attr( $name ); ?>[org_description]"><?php echo esc_textarea( $options['org_description'] ); ?></textarea></td></tr>
				<tr><th scope="row"><label for="geolint-same-as"><?php esc_html_e( 'Profile links (one per line)', 'geolint-ai-visibility' ); ?></label></th>
					<td><textarea id="geolint-same-as" class="large-text code" rows="4" name="<?php echo esc_attr( $name ); ?>[same_as]" placeholder="https://www.linkedin.com/company/..."><?php echo esc_textarea( $options['same_as'] ); ?></textarea></td></tr>
			</table>

			<?php submit_button(); ?>
		</form>

		<h2><?php esc_html_e( 'Check my site', 'geolint-ai-visibility' ); ?></h2>
		<p><a class="button" href="<?php echo esc_url( $check_url ); ?>"><?php esc_html_e( 'Check robots.txt and llms.txt now', 'geolint-ai-visibility' ); ?></a>
			<span class="description"><?php esc_html_e( 'Reads your live files the way a crawler does. Save first, and allow a minute if you use caching.', 'geolint-ai-visibility' ); ?></span></p>
		<?php if ( $checked ) : ?>
			<ul style="list-style:disc;margin-left:20px">
				<li><?php
				if ( $robots && $robots['ok'] ) {
					esc_html_e( 'robots.txt: reachable. Crawler status is shown in the table above.', 'geolint-ai-visibility' );
				} else {
					esc_html_e( 'robots.txt: could not be read.', 'geolint-ai-visibility' );
				}
				?></li>
				<li><?php
				$llms_ok = $llms && $llms['ok'] && '' !== trim( $llms['body'] ) && false === stripos( $llms['body'], '<html' );
				echo $llms_ok // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped below.
					? esc_html__( 'llms.txt: reachable and returning text.', 'geolint-ai-visibility' )
					: esc_html__( 'llms.txt: not found. Turn on "Serve /llms.txt", save, and check again.', 'geolint-ai-visibility' );
				?></li>
			</ul>
		<?php endif; ?>
	</div>
	<script>
	document.getElementById('geolint-recommended').addEventListener('click', function () {
		var allow = <?php echo wp_json_encode( geolint_aiv_recommended_allow() ); ?>;
		document.querySelectorAll('select[data-agent]').forEach(function (s) {
			if (allow.indexOf(s.getAttribute('data-agent')) !== -1) { s.value = 'allow'; }
		});
	});
	</script>
	<?php
}

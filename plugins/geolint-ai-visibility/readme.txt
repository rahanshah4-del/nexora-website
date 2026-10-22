=== GeoLint AI Visibility ===
Contributors: nexorasolution
Tags: ai, robots.txt, llms.txt, schema, seo
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Apply the fixes a GeoLint audit finds: robots.txt rules for AI crawlers, an llms.txt file and Organization schema.

== Description ==

GeoLint (https://nexorasolution.us/tools/geo-audit/) checks whether AI tools such as ChatGPT, Claude, Perplexity and Gemini can read your website. This plugin applies the most common fixes from your WordPress dashboard:

* **AI crawler rules.** Allow or block 12 AI crawlers in robots.txt, such as OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, ClaudeBot, PerplexityBot and Google-Extended. A preset allows the search and answer crawlers.
* **llms.txt.** Serves /llms.txt, generated from your site name, tagline, pages and latest posts, or from text you write.
* **Organization schema.** Adds Organization and WebSite JSON-LD to your home page.
* **Check my site.** Reads your live robots.txt and shows what each AI crawler is allowed to do.

Nothing changes until you save the settings. llms.txt is a proposed convention, and no AI company guarantees that any setting changes how your site appears in AI answers.

= External services =

This plugin does not send any data from your site to us or to any third party, and it does not track visitors. The "Check my site" button only requests your own robots.txt and llms.txt from your own address. The settings page links to the free GeoLint audit at https://nexorasolution.us/tools/geo-audit/; nothing is sent there unless you open that link and enter an address yourself.

= Notes =

* If your site has a real robots.txt or llms.txt file in its folder, WordPress cannot edit it. The settings page tells you and shows the rules to paste.
* If "Discourage search engines from indexing this site" is on, WordPress blocks all crawlers and the crawler rules are not applied.
* If an SEO plugin already prints Organization schema, leave the schema option off.

== Installation ==

1. Upload the plugin and activate it.
2. Open Settings > GeoLint AI Visibility.
3. Choose your crawler rules, turn on llms.txt and schema if you want them, then save.
4. Click "Check robots.txt and llms.txt now".

== Changelog ==

= 1.0.0 =
* First release.

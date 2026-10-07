# DE Educare WordPress theme

A block theme built from the `De educare Website v4` design. It covers the Home, CAT, MBA-CET, OMETs (SNAP, NMAT, XAT, CMAT), Free resources and Contact pages. Test buttons, sign-in and checkout link to the student portal (`portal.deeducare.com`). The portal runs the exam window, payments and AI analysis.

## Install

1. Zip this folder: `cd wordpress-theme && zip -r deeducare.zip deeducare`.
2. In WordPress, go to **Appearance → Themes → Add New → Upload Theme**, upload the zip, then click **Activate**.
3. When you activate the theme, it creates the pages `/cat/`, `/mba-cet/`, `/omet/`, `/free-resources/` and `/contact/` if they don't exist yet. If a page with that slug already exists, it now shows the designed layout instead of its old content.
4. Go to **Settings → Permalinks** and choose **Post name**.
5. Go to **Appearance → Customize → DE Educare** and set these:
   - portal URL, phone, WhatsApp number, email and hours
   - CAT exam date (drives the countdown)
   - social and community links
   - exam banner photos
   - the email address that receives call-back requests

   The site logo is under **Site Identity**.
6. Optional, for Guru: to turn on the live AI preview on the home page, add this line to `wp-config.php`:
   ```php
   define( 'DEEDUCARE_ANTHROPIC_API_KEY', 'sk-ant-…' );
   ```
   Without a key, Guru gives a fixed study tip. Visitors get 3 preview questions per day.

## Editing content

- **Prices, FAQs, exam dates, cutoffs, colleges and sample quotes** live in `inc/content.php`. Every page and the search-engine data (JSON-LD) read from that one file.
- A price of `'₹ —'` means "coming soon". Its button shows a notice instead of going to checkout. To make a plan buyable, set `price` and `amount` (for example `'₹1,500'` and `1500`).
- **To rearrange sections**, use **Appearance → Editor → Templates**. Each section is a **DE Educare section** block. You can move or remove it, or add another one and pick which section it shows from the sidebar.
- **Privacy, terms and refund pages** are normal pages, so you write them in the regular editor.

## Links into the portal

| Action | URL |
|---|---|
| Sign in / Join free | `{portal}/login`, `{portal}/signup` |
| Free or unlocked test | `{portal}/test/{test-id}` (e.g. `cat-m-1`, `cat-ss-0-1`, `cat-tp-percentages-1`, `cat-d-20261007`) |
| Locked test / plan | `{portal}/checkout?plan={plan-id}&test={test-id}` |
| Daily free test | `{portal}/daily/{cat\|cet\|omet}` |

The portal must accept these routes. If a student already owns the plan, it should send them straight to the test.

## SEO

- Each page gets its own title, meta description, canonical URL and Open Graph tags.
- Each page also gets JSON-LD structured data: the organisation, courses with prices, its FAQs and the breadcrumb.
- If Rank Math, Yoast or AIOSEO is active, the plugin handles titles and meta tags, and the theme adds only the course, FAQ and breadcrumb data. In that case, turn off the plugin's own FAQ schema.
- FAQs and all tab content are in the page HTML, so search engines can read them.

# DE Educare WordPress theme

A block theme built from the `De educare Website v4` design. It covers the Home, CAT, MBA-CET, OMETs (SNAP, NMAT, XAT, CMAT), Free resources and Contact pages. Test buttons, sign-in and checkout link to the student portal (`portal.deeducare.com`). The portal runs the exam window, payments and AI analysis.

## Install

1. Zip this folder: `cd wordpress-theme && zip -r deeducare.zip deeducare`.
2. In WordPress, go to **Appearance → Themes → Add New → Upload Theme**, upload the zip, then click **Activate**.
3. When you activate the theme, it creates the pages Home, `/cat/`, `/mba-cet/`, `/omet/`, `/free-resources/` and `/contact/` and fills any that are empty. It also sets Home as the front page. Pages you have already written are left alone.
4. Go to **Settings → Permalinks** and choose **Post name**.
5. Go to **Appearance → Customize → DE Educare** and set these:
   - portal URL, phone, WhatsApp number, email and hours
   - CAT exam date (drives the countdown)
   - social and community links
   - exam banner photos
   - the email address that receives call-back requests

   The site logo is under **Site Identity**. If your logo image already includes the name, leave **Show the name "DE Educare" next to the logo** unticked so the name doesn't appear twice.
6. **Turn off any old chat widget plugin** (Plugins → Deactivate). Guru replaces it on every page.

## Editing content

Every page is a normal WordPress page made of standard blocks: headings, paragraphs, images, buttons, lists, tables, FAQ accordions and groups. Open the page in **Pages** and edit it like any other page.

- **Change anything:** click any text, image or button and edit it. Use the block toolbar to move a block up or down, and the **+** button to add new blocks.
- **Button colours:** select a button and pick a style in the sidebar (Blue, Outline, Amber, White, Ghost, Soft blue or Dark).
- **Buttons that open forms or Guru:** a button linking to `#enquire-cat-coaching-2027` (or `#enquire-cet-coaching-2028`, `#enquire-mba-plus`) opens the enquiry form with that programme picked. A link to `#ask-guru` opens Guru.
- **FAQs:** each question is a Details block. Edit, add or delete questions freely. Search engines get the FAQ data from what is on the page.
- **Live blocks:** blocks named **DE Educare section · Live …** show data from the student portal: prices, test lists, the predictor, the enquiry and call-back forms, free questions and reviews. They update on their own; move or remove them like any block.
- **New landing page:** create a page and pick the template **DE Educare sections (full width)** in the page sidebar. Copy sections from another page with the block menu (⋮ → Copy) and paste.
- **Start a page over:** **Appearance → DE Educare pages** rebuilds a page from the theme's version. Your current version stays in the page's **Revisions**, so you can go back.
- **Prices of test series and plans** come from the portal (Admin → Plans). The website keeps a saved copy and refreshes it in the background every 10 minutes, so pages never wait for the portal. Coaching fees on the pages are plain text: change them in the page. `inc/content.php` holds the content the theme uses when it builds a page.
- **Privacy, terms and refund pages** are normal pages too.

## Guru on every page

Guru is the floating **Ask Guru** button on every page (`assets/js/guru.js`). It talks to the portal, not to WordPress, so no API key is stored in WordPress.

- **Signed-in students** (signed in at the portal, same DE Educare ID) get their own Guru: the same chat history and coins as in the portal and the app, chat or voice.
- **Visitors** get 3 free questions a day, then an invitation to create a free DE Educare ID.
- Other scripts can open it with `DEGuru.open('question')`.

The website and portal must share the parent domain (for example `deeducare.com` and `portal.deeducare.com`) and the portal needs `COOKIE_DOMAIN=.deeducare.com` and `WEBSITE_URL=https://deeducare.com` in Vercel.

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
- FAQs and all tab content are in the page HTML, so search engines can read them. The FAQ structured data is read from the page's FAQ blocks, so it always matches what visitors see.

# Azariah Signal Website

A deliberately minimal, mysterious one-page experience for:

- azariahband.com
- azariah.band

The page looks and sounds like an intercepted AM/shortwave transmission. It uses the Azariah song **“Chances”** beneath browser-generated radio static. A pre-filtered AM-radio copy plays directly in the browser for reliable local preview.

## Preview locally

Audio features work best through a local web server:

```bash
cd azariah-band-site
python3 -m http.server 8080
```

Then visit `http://localhost:8080` and click **RECEIVE SIGNAL**.

## Audio behavior

Modern browsers block sound until the visitor interacts with the page. After the first click:

- AM-style static begins immediately.
- Quiet intervals are shorter, but still unstable and unpredictable.
- Very quiet traces and occasional short fragments of “Chances” emerge unpredictably.
- Fragments can collapse suddenly, stutter through brief dropouts, or drift in playback speed.
- Static rises whenever the carrier disappears.
- Faint German shortwave fragments bleed through during some music-free intervals.
- The maximum song volume is intentionally low so it feels buried beneath the interference.

## Replace the song later

Put another MP3 in `assets/` and update this line in `index.html`:

```html
<source src="assets/chances-radio.mp3" type="audio/mpeg" />
```

## Deployment

Upload the entire folder to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or a normal web host. Use `azariahband.com` as the primary domain and redirect `azariah.band` to it, or connect both domains to the same deployment.


The experience now rotates among three distinct audio states: the Azariah song, pure static, and a boosted German transmission bleeding through from an adjacent frequency.


## Concept reference
The current `assets/german-transmission.mp3` is a temporary stand-in for the final German shortwave recording. For launch, replace that file with a cleared or newly recorded native German voice processed to resemble an authentic shortwave/AM intercept. Keep the same filename and the site logic will continue to work without code changes. The intended sequence is: static → quick music breakthrough → abrupt loss → one German shortwave intercept already in progress → static → music returns unpredictably.

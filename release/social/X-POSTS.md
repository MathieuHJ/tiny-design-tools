# X posts

Six posts, each with its image and alt text. Nothing here has been posted; that is yours to do.

All six images are 2400 × 1350 (16:9), which X shows in full, and each is under 1.4 MB (X's limit is 5 MB). Counts follow X's rule that every link is 23 characters. Regenerate the images with `pnpm capture:social`.

## Suggested plan

1. **Post the launch post first** with the collection image, and pin it.
2. **Post one tool a day** for the next five days, in the order below. Each tool has its own hook, so each gets its own post rather than being buried in a thread.
3. **Put the link in the post, or in a reply.** The posts below have the link in the post so the card is self-contained. If you would rather keep the link out of the post (some find it travels further), move the last line into a reply and keep the reply with the limitation.
4. **Add the alt text** when you attach each image. It is written for someone who cannot see the card.

The tool order, and why:

| Day | Post | Why it goes here |
|---|---|---|
| 1 | Collection | The whole set, in one image |
| 2 | Profile Kit | The most visual, and the one people will recognise from their own accounts |
| 3 | Squint | The single clearest before and after |
| 4 | Crop Proof | A problem every designer has met |
| 5 | Concentric | A small, sharp fact |
| 6 | Copy Stress | Needs a sentence of explanation, so it goes last |

The cards above are in their numbered order in the folder. The table is a suggestion, not a rule.

---

## Launch: the collection

**Image:** `collection.png`

**Post** (230 of 280)

```
I made five small tools for design work. Each takes real design input, makes one thing visible, and exports proof you can share.

They run in your browser. No account, no upload, no analytics. Open source.

https://mathieuhj.github.io/tiny-design-tools/
```

**Reply** (108 of 280)

```
Crop Proof, Copy Stress, Squint, Concentric and Profile Kit. Code and photo credits: https://github.com/MathieuHJ/tiny-design-tools
```

**Alt text** (269 of 1000)

```
A browser window showing the Tiny Design Tools home page: the heading "Tiny design tools", the words no account, no upload, no analytics and MIT licensed, and the first row of tool cards for Crop Proof, Copy Stress and Squint, each with a preview of its exported proof.
```

---

## Crop Proof

**Image:** `crop-proof.png`

**Post** (268 of 280)

```
One photo, six crops, and the subject goes missing in the tall one.

Crop Proof: mark the subject once and see it across avatar, card, square, mobile hero, desktop hero and Open Graph, with how much of the photo each one keeps. Copies the CSS.

https://mathieuhj.github.io/tiny-design-tools/crop-proof/
```

**Reply** (103 of 280)

```
Limitation: it keeps one point, not the full bounds of a subject. A large subject can still be clipped.
```

**Alt text** (350 of 1000)

```
A browser window showing Crop Proof with six crops of the same photograph of a lighthouse on a rocky coast at dusk: avatar, card, square, mobile hero, desktop hero and Open Graph. A crosshair marks the lighthouse in every crop, and each crop shows the share of the photo it keeps, from 100 percent for the card down to 42 percent for the mobile hero.
```

---

## Copy Stress

**Image:** `copy-stress.png`

**Post** (246 of 280)

```
Every interface looks fine with the copy it was designed for.

Copy Stress is a bookmarklet. Doubled copy, empty strings, accents, right to left, no word breaks. It outlines what breaks. Here it is running on my own site.

https://mathieuhj.github.io/tiny-design-tools/copy-stress/
```

**Reply** (93 of 280)

```
It reads regular page text only, and strict Content Security Policies can block bookmarklets.
```

**Alt text** (289 of 1000)

```
A browser window showing the Tiny Design Tools home page after Copy Stress has made every string unbreakable. The headline and card titles run past their containers, each outlined with a dashed box and a numbered overflow label, and a small control panel in the corner reports 18 findings.
```

---

## Squint

**Image:** `squint.png`

**Post** (242 of 280)

```
The squint test, but you can share it.

Blur a screenshot until something important disappears, then export both versions side by side. In this one the orange button is the loudest thing on the page, until you squint.

https://mathieuhj.github.io/tiny-design-tools/squint/
```

**Reply** (102 of 280)

```
The numbered points show where contrast survives the blur. They are not a model of where anyone looks.
```

**Alt text** (353 of 1000)

```
A browser window showing Squint with a travel landing page on the left and the same page blurred to grey on the right. In colour the orange Start planning button stands out. In the blurred grey version the button has disappeared, while the headline and the photograph of sand dunes still read. Three numbered rings mark the strongest remaining contrast.
```

---

## Concentric

**Image:** `concentric.png`

**Post** (243 of 280)

```
Nested rounded corners look off when the inner box reuses the outer radius: the gap at the corner is 41% wider than at the sides.

Concentric draws both and gives you the CSS. Inner radius = outer radius minus padding.

https://mathieuhj.github.io/tiny-design-tools/concentric/#r=40&p=16&l=2
```

**Reply** (109 of 280)

```
Circular corners only. Continuous, iOS-style corners use a different curve, so the rule is approximate there.
```

**Alt text** (429 of 1000)

```
A browser window showing Concentric. Two rounded cards, each with a photograph of a sunlit mountain peak inside, sit side by side. On the left both corners use the same radius and the corner gap is marked as 1.41 times the side gap. On the right the inner radius is smaller and the gap is an even 1.00. Dashed circles show the arc centres: offset on the left, shared on the right. The CSS below uses calc of radius minus padding.
```

---

## Profile Kit

**Image:** `profile-kit.png`

**Post** (269 of 280)

```
Set up your avatar, banner, bio and feed once. See them on Instagram, TikTok, Facebook and X before you post.

It checks your bio against each platform's limit and exports each avatar and banner at its platform's size.

Local, nothing uploaded.

https://mathieuhj.github.io/tiny-design-tools/profile-kit/
```

**Reply** (157 of 280)

```
The mocks approximate each platform's layout, and the specs are a snapshot. Only X publishes its numbers, so the tool marks the rest as reported or disputed.
```

**Alt text** (381 of 1000)

```
A browser window showing Profile Kit. Four mock phone profiles, for Instagram, TikTok, Facebook and X, share one avatar of a blue ceramic vase, a banner of orange sand dune ripples, and a bio. The Instagram and TikTok mocks show a grid of photographs. A heading reports that the bio fits all four platforms. An editor panel on the right holds the avatar crop, name, handle and bio.
```

---

## Before you post

- **The photographs** in the images are from Unsplash, under the Unsplash License, and are credited in the repository's `CREDITS.md`. The launch reply points to it. No attribution is required, and it costs nothing to give.
- **Claims to hold to.** The 41% in the Concentric post is the corner gap measured along the diagonal for a same-radius corner (the square root of two, 1.41). The 42% on the Crop Proof card is what the demo image keeps in a 9:16 crop. The 18 findings on the Copy Stress card is the real count from running the bookmarklet on the home page in "unbroken" mode. If you change any of these, regenerate the image.
- **Profile Kit's specs** were checked on 8 October 2026. Only X's come from the platform's own help pages. The post says so in the reply, and the tool says so too.
- **Dark cards** are available with `pnpm capture:social dark`. They are not included here: the dark window almost merges with a dark background, and the light cards stand out more in a feed.

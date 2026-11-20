# mohit-web12.github.io

My portfolio site. Plain HTML and CSS with a few lines of vanilla JS for the demo video. No framework, no build step. It's hosted on GitHub Pages from the root of `main`.

## Layout

```
index.html            homepage
work/*.html           one write up per project
css/tokens.css        colors, fonts, measures (custom properties) and @font-face
css/site.css          everything else
fonts/                Newsreader, Public Sans, Spline Sans Mono (Google Fonts, OFL), latin subsets
img/                  WebP screenshots, the SpendGauge demo clip, the Open Graph image
img/charts/           charts regenerated with matplotlib from the original data
resume.pdf            current resume
404.html              GitHub Pages serves this for missing paths (uses root relative links)
```

## Run it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Rules I hold the site to

- Every number on the site comes from my resume, a repo, or the original analysis files.
- No course codes, student ID, phone number, or cloud account IDs on any page or image.
- Images are WebP, at most 1600px wide and under 300 KB, with `width` and `height` set.
- Text passes WCAG AA on the paper background. Vermilion is only used for marks, never text.

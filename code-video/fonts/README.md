# fonts

Shared font files any project can use. Put `.woff2` (or `.ttf`/`.otf`) files here, then declare them in a project's `index.html`:

```css
@font-face { font-family: "Inter"; src: url("/fonts/Inter.woff2") format("woff2"); font-weight: 100 900; }
```

Without a file here, pages fall back to Segoe UI.

Free, open-licensed picks (SIL Open Font License), from fonts.google.com or the projects' own sites:
- Inter: clean UI and product type (here: 400–900)
- Anton: condensed display capitals, the word behind the head (here: `anton-latin-400-normal.woff2`)
- Space Grotesk: techy display
- Fraunces: storybook serif (the kids' story guides)

Check the licence before using a commercial font in a video. SF Pro, for example, is licensed for Apple-platform UI.

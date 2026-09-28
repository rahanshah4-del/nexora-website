# Fonts

`NotoSans-Regular.subset.ttf`, `NotoSans-Bold.subset.ttf`,
`NotoSerif-Regular.subset.ttf` and `NotoSerif-Bold.subset.ttf` are subsets of
Noto Sans and Noto Serif (Copyright 2022 The Noto Project Authors,
https://github.com/notofonts/latin-greek-cyrillic), licensed under the SIL Open
Font License 1.1 — see `OFL.txt` in this folder (identical for both families).

They are embedded by the Docs Studio "Download PDF" renderer
(`src/tools/docs-studio/pdf/`) and fetched only when a PDF is generated; Noto
Serif only for templates that use the serif font (Minimal).

Subset (fontTools `pyftsubset`, no hinting, no OpenType layout features, all
name records kept):

    U+0000-024F  Basic Latin, Latin-1, Latin Extended-A/B
    U+02B0-02FF  Spacing modifier letters
    U+0300-036F  Combining diacritical marks
    U+0370-03FF  Greek
    U+0400-052F  Cyrillic + Cyrillic Supplement
    U+1E00-1EFF  Latin Extended Additional (Vietnamese)
    U+2000-206F  General punctuation (dashes, quotes, ellipsis, spaces)
    U+20A0-20CF  Currency Symbols (whole block)
    U+2100-214F  Letterlike symbols (№, ™)
    U+2212       Minus sign

Source files: the static Noto Sans / Noto Serif 400 and 700 TTFs from Google
Fonts (as shipped in the `@expo-google-fonts/noto-sans` and
`@expo-google-fonts/noto-serif` packages, 0.4.2). Same subset for both.

# Bank logos

Drop a logo here named after the bank's `code` in lowercase, then run
`npm run db:logos`:

    public/banks/hdfc.svg   ->  HDFC
    public/banks/sbi.png    ->  SBI

SVG is ideal. PNG should be at least 128px square with a transparent
background. `.svg`, `.png` and `.webp` are accepted.

Banks without a file here show a coloured monogram instead, which is the
default on purpose — see the docblock in `scripts/set-bank-logos.ts` for the
measurements behind that decision.

Files are served from this origin, so the Content-Security-Policy stays
`img-src 'self'` and no third party learns which banks a user is browsing.

A note on rights: these are other companies' trademarks. Using them to
identify the bank a card belongs to is ordinary nominative use, but they are
not ours to redistribute, which is why none are committed.

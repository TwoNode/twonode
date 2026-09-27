// Nested inside app/(projects)/(surfboard)/layout.tsx, which sets
// data-product="surfboard" for the whole route group (surfboard,
// surfboard-mda, surfboard-restricted all share it). MDA overrides that
// here to "surfboard-mda" so it picks up its own brand tokens (mirrors
// GBC's palette — see surfboard/mdaColors.ts) instead of Surfboard's blue.
export default function SurfboardMdaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div data-product="surfboard-mda">{children}</div>;
}

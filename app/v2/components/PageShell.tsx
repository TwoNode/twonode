import { SiteHeader, type V4Section } from "./SiteHeader";
import { Footer } from "./Footer";
import { MotionLayer } from "./MotionLayer";

/** Header, main, footer and the motion layer, for the inner /v2 pages. */
export function PageShell({
  current,
  children,
}: {
  current: V4Section;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader current={current} />
      <main>{children}</main>
      <Footer />
      <MotionLayer />
    </>
  );
}

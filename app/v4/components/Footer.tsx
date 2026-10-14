import Link from "next/link";

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/twonode-technologies-limited/about/",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/twonodetechnologies/",
  },
  { label: "X", href: "https://x.com/TwoNodeTech" },
];

export function Footer() {
  return (
    <footer className="vf">
      <div className="vf-inner">
        <div className="vf-grid">
          <div className="vf-brand">
            <Link href="/v4" aria-label="TwoNode home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="vf-logo"
                src="/logo.svg"
                alt="TwoNode Technologies"
                width={161}
                height={40}
              />
            </Link>
            <p className="vf-tagline">
              Understand the industry.
              <br />
              Build what it needs.
            </p>
            <ul className="vf-socials" aria-label="Social links">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label} <span>↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <nav className="vf-col vf-col-contact" aria-label="Reach us">
              <h2 className="vf-reach">Reach us</h2>
              <ul>
                <li>
                  <a href="mailto:info@twonodetechnologies.com">
                    info@twonodetechnologies.com
                  </a>
                </li>
                <li>
                  <a href="tel:+2349160002740">+234 916 0002 740</a>
                </li>
              </ul>
            </nav>
          </div>

          <nav className="vf-col vf-col-industries" aria-label="Industries">
            <h2>Industries</h2>
            <ul>
              <li>
                <Link href="/v4/industries/surveying-geospatial">
                  Surveying &amp; geospatial
                </Link>
                <span className="vf-state">Active now</span>
              </li>
              <li>
                <Link href="/v4/industries/real-estate">Real estate</Link>
                <span className="vf-state">Up next</span>
              </li>
            </ul>
          </nav>

          <nav className="vf-col" aria-label="Products">
            <h2>Products</h2>
            <ul>
              <li>
                <a
                  href="https://www.twonodetechnologies.com/surfboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  Surfboard <span>↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.twonodetechnologies.com/reva"
                  target="_blank"
                  rel="noreferrer"
                >
                  REVA <span>↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.twonodetechnologies.com/gbc"
                  target="_blank"
                  rel="noreferrer"
                >
                  GBC <span>↗</span>
                </a>
              </li>
            </ul>
          </nav>

          <div className="vf-col-group">
            <nav className="vf-col" aria-label="Company">
              <h2>Company</h2>
              <ul>
                <li>
                  <Link href="/v4/our-story">Our story</Link>
                </li>
                <li>
                  <Link href="/v4/insights">Insights</Link>
                </li>
                <li>
                  <Link href="/v4/contact">Contact</Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="vf-bottom">
          <span>© {new Date().getFullYear()} TwoNode Technologies Ltd.</span>
          <span>RC NO.: 7742902 · Lagos · Abuja, Nigeria</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

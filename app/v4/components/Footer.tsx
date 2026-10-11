import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Link
          className="brand brand-footer"
          href="/v4"
          aria-label="TwoNode home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand-logo"
            src="/logo.svg"
            alt="TwoNode Technologies"
            width={161}
            height={40}
          />
        </Link>
        <p>
          Understand the industry.
          <br />
          Build what it needs.
        </p>
        <div className="footer-links">
          <Link href="/v4/our-story">Our story</Link>
          <Link href="/v4#work">Our work</Link>
          <a href="mailto:info@twonodetechnologies.com">
            info@twonodetechnologies.com
          </a>
          <a href="tel:+2349160002740">+234 916 0002 740</a>
          <a
            href="https://www.linkedin.com/company/twonode-technologies-limited/about/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
          <a
            href="https://www.instagram.com/twonodetechnologies/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram ↗
          </a>
          <a href="https://x.com/TwoNodeTech" target="_blank" rel="noreferrer">
            X ↗
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © <span>{new Date().getFullYear()}</span> TwoNode Technologies
        </span>
        <span>Built around the way industries work.</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}

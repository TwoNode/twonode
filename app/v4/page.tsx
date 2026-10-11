/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";
import { Footer } from "./components/Footer";
import { MotionLayer } from "./components/MotionLayer";
import { proof } from "./data/proof";

export const metadata: Metadata = {
  title: "TwoNode Technologies — Build for the way industries work",
  description:
    "TwoNode builds digital solutions around the realities of African industries. We understand the work, identify what is missing, and build what helps it move forward.",
};

export default function V4HomePage() {
  return (
    <>
      <SiteHeader current="home" />
      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot"></span> WE BUILD FOR INDUSTRIES
            </p>
            <h1>
              Every industry has its own <span>way of working.</span>
            </h1>
            <p className="hero-lede">
              We get close to that reality, understand what holds it back, and
              build what helps it move forward.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#work">
                Explore our work <span>↘</span>
              </a>
              <Link className="text-link" href="/v4/our-story">
                Get to know us <span>↗</span>
              </Link>
            </div>
            <div className="hero-foot">
              <span className="tiny-line"></span>
              <span>Understand deeply. Build simply. Connect the pieces.</span>
            </div>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Two nodes divide and grow into a connected network of people, systems and information"
          >
            <canvas className="hero-canvas" aria-hidden="true"></canvas>
            <div className="art-caption">
              <span className="caption-dot"></span> Better work starts with
              connection
            </div>
          </div>
          <div className="hero-bottom">
            <div>
              <strong>01</strong>
              <span>Understand the industry</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Find what is missing</span>
            </div>
            <div>
              <strong>03</strong>
              <span>Build what makes a difference</span>
            </div>
          </div>
        </section>
        <section className="intro-band">
          <div className="section-wrap intro-grid">
            <p className="eyebrow">OUR POINT OF VIEW</p>
            <div>
              <h2>The product is only part of the work.</h2>
              <p>
                Sometimes the answer is software. Sometimes it is a better
                workflow. Sometimes it is bringing the right people into the
                same room. Sometimes it is all three.
              </p>
            </div>
          </div>
        </section>
        <section className="section-wrap approach section-pad" id="approach">
          <div className="section-heading">
            <p className="eyebrow">HOW WE WORK</p>
            <h2>
              Better solutions begin
              <br />
              <span>with understanding.</span>
            </h2>
            <p>
              We start with the way work actually happens. Then we work out what
              will make it better.
            </p>
          </div>
          <div className="principles">
            <article className="principle">
              <div className="principle-top">
                <span>01 / OBSERVE</span>
                <span className="principle-symbol">⌕</span>
              </div>
              <h3>Understand deeply</h3>
              <p>
                We get close to the people, processes and realities behind an
                industry&#39;s problems.
              </p>
              <div className="principle-rule"></div>
            </article>
            <article className="principle">
              <div className="principle-top">
                <span>02 / CREATE</span>
                <span className="principle-symbol">↗</span>
              </div>
              <h3>Build simply</h3>
              <p>
                We turn complex operational challenges into practical solutions
                people can use.
              </p>
              <div className="principle-rule"></div>
            </article>
            <article className="principle">
              <div className="principle-top">
                <span>03 / CONNECT</span>
                <span className="principle-symbol">⌘</span>
              </div>
              <h3>Connect the pieces</h3>
              <p>
                We bring information, systems and industry players closer
                together so work can move forward.
              </p>
              <div className="principle-rule"></div>
            </article>
          </div>
        </section>
        <section className="origin-section">
          <div className="section-wrap origin-grid">
            <div className="origin-visual">
              <figure className="plan-photo">
                <img
                  className="plan-img"
                  src="/v4/survey-plan.webp"
                  width="644"
                  height="1130"
                  loading="lazy"
                  decoding="async"
                  alt="A printed cadastral survey plan being scanned and its plot boundary traced, with names and contact details blurred"
                />
                <div className="plan-fx" aria-hidden="true">
                  <i className="plan-grid"></i>
                  <svg className="plan-svg" viewBox="0 0 644 1130">
                    <path
                      className="pf-fill"
                      d="M263 595L371 507L408 553L301 648Z"
                    ></path>
                    <path
                      className="pf-trace"
                      pathLength="100"
                      d="M263 595L371 507L408 553L301 648Z"
                    ></path>
                    <g className="pf-pings">
                      <circle className="pp1" cx="263" cy="595" r="7"></circle>
                      <circle className="pp2" cx="371" cy="507" r="7"></circle>
                      <circle className="pp3" cx="408" cy="553" r="7"></circle>
                      <circle className="pp4" cx="301" cy="648" r="7"></circle>
                    </g>
                    <g className="pf-beacons">
                      <circle className="pb1" cx="263" cy="595" r="7"></circle>
                      <circle className="pb2" cx="371" cy="507" r="7"></circle>
                      <circle className="pb3" cx="408" cy="553" r="7"></circle>
                      <circle className="pb4" cx="301" cy="648" r="7"></circle>
                    </g>
                  </svg>
                  <i className="plan-beam"></i>
                </div>
              </figure>
              <p className="plan-caption">FROM PAPER TO ACCESSIBLE RECORDS</p>
            </div>
            <div className="origin-copy">
              <p className="eyebrow">WHERE WE STARTED</p>
              <h2>
                We started with surveying.{" "}
                <span>The problem was bigger than the paperwork.</span>
              </h2>
              <p>
                We knew an industry where important information moved between
                surveyors, government offices and property stakeholders, often
                through disconnected systems and paper-based processes.
              </p>
              <p>
                So we began building Surfboard, a digital platform for survey
                plan records that helps surveyors organise, access and share
                their work.
              </p>
              <p>
                What started with a problem we knew became the beginning of a
                broader question:
              </p>
              <blockquote>
                What else could work better if the right people, information and
                systems were connected?
              </blockquote>
              <Link className="text-link" href="/v4/our-story">
                Read our story <span>↗</span>
              </Link>
            </div>
          </div>
        </section>
        <section className="section-wrap work-section section-pad" id="work">
          <div className="section-heading work-heading">
            <div>
              <p className="eyebrow">OUR WORK</p>
              <h2>
                Different industries.
                <br />
                <span>A shared approach.</span>
              </h2>
            </div>
            <p>
              Each project starts with its own challenges, people and
              opportunities. The way we approach them connects the work.
            </p>
          </div>
          <div className="work-grid">
            <article className="work-card surfboard">
              <div className="product-art surf-art">
                <div className="mini-map">
                  <img
                    className="plan-crop"
                    src="/v4/survey-plan-crop.webp"
                    width="372"
                    height="240"
                    loading="lazy"
                    decoding="async"
                    alt="Close-up of a cadastral survey plan showing a plot boundary with beacon marks"
                  />
                  <div className="plan-fx card-fx" aria-hidden="true">
                    <i className="plan-grid"></i>
                    <svg
                      className="card-svg"
                      viewBox="0 0 372 240"
                      preserveAspectRatio="xMidYMid slice"
                    >
                      <path
                        className="pf-fill"
                        d="M221 49L258 95L151 190L113 137Z"
                      ></path>
                      <path
                        className="pf-trace"
                        pathLength="100"
                        d="M221 49L258 95L151 190L113 137Z"
                      ></path>
                      <g className="pf-pings">
                        <circle className="pp1" cx="221" cy="49" r="4"></circle>
                        <circle className="pp2" cx="258" cy="95" r="4"></circle>
                        <circle
                          className="pp3"
                          cx="151"
                          cy="190"
                          r="4"
                        ></circle>
                        <circle
                          className="pp4"
                          cx="113"
                          cy="137"
                          r="4"
                        ></circle>
                      </g>
                      <g className="pf-beacons">
                        <circle className="pb1" cx="221" cy="49" r="4"></circle>
                        <circle className="pb2" cx="258" cy="95" r="4"></circle>
                        <circle
                          className="pb3"
                          cx="151"
                          cy="190"
                          r="4"
                        ></circle>
                        <circle
                          className="pb4"
                          cx="113"
                          cy="137"
                          r="4"
                        ></circle>
                      </g>
                    </svg>
                    <i className="plan-beam"></i>
                  </div>
                </div>
              </div>
              <div className="work-card-copy">
                <p className="eyebrow">
                  SURFBOARD
                  <span className="status status-active">Active</span>
                  <span className="eyebrow-cat">
                    Surveying &amp; geospatial
                  </span>
                </p>
                <h3>Make survey plan records more accessible and useful.</h3>
                <p>
                  A digital platform that helps surveyors organise, retrieve and
                  share their survey plan records.
                </p>
                <a
                  className="text-link"
                  href="https://www.twonodetechnologies.com/surfboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore Surfboard <span>↗</span>
                </a>
              </div>
            </article>
            <article className="work-card reva">
              <div className="product-art reva-art">
                <div className="property-panel">
                  <div className="property-map">
                    <div className="property-street street-one"></div>
                    <div className="property-street street-two"></div>
                    <div className="property-street street-three"></div>
                    <div className="property-block block-one"></div>
                    <div className="property-block block-two"></div>
                    <div className="property-block block-three"></div>
                    <div className="property-pin">⌖</div>
                  </div>
                  <div className="property-info">
                    <div className="info-line long"></div>
                    <div className="info-line medium"></div>
                  </div>
                </div>
              </div>
              <div className="work-card-copy">
                <p className="eyebrow">
                  REVA<span className="status status-next">Next</span>
                  <span className="eyebrow-cat">Real estate</span>
                </p>
                <h3>Make property information easier to understand.</h3>
                <p>
                  Location and property research designed to help people assess
                  real estate opportunities with greater clarity.
                </p>
                <a
                  className="text-link"
                  href="https://www.twonodetechnologies.com/reva"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore REVA <span>↗</span>
                </a>
              </div>
            </article>
            <article className="work-card gbc">
              <div className="product-art gbc-art">
                <div className="gbc-title">
                  GEOSPATIAL
                  <br />
                  <span>BUILDERS</span>
                  <br />
                  CONFERENCE<span className="gbc-star">✳</span>
                </div>
                <div className="gbc-people">
                  <span className="person p1"></span>
                  <span className="person p2"></span>
                  <span className="person p3"></span>
                  <span className="person p4"></span>
                  <span className="person p5"></span>
                  <span className="person p6"></span>
                  <span className="person p7"></span>
                  <span className="person p8"></span>
                </div>
              </div>
              <div className="work-card-copy">
                <p className="eyebrow">
                  GEOSPATIAL BUILDERS CONFERENCE
                  <span className="status status-active">Active</span>
                  <span className="eyebrow-cat">Industry community</span>
                </p>
                <h3>Bring the industry into the room.</h3>
                <p>
                  A gathering that creates space for geospatial professionals to
                  exchange ideas, build relationships and explore what comes
                  next.
                </p>
                <a
                  className="text-link"
                  href="https://www.twonodetechnologies.com/gbc/gallery"
                  target="_blank"
                  rel="noreferrer"
                >
                  See the GBC gallery <span>↗</span>
                </a>
              </div>
            </article>
          </div>
        </section>
        <section className="proof">
          <div className="section-wrap proof-inner">
            <p className="eyebrow">THE NUMBERS SO FAR</p>
            <div className="proof-grid">
              <div className="stat">
                <strong className="count" data-to={proof.plans}>
                  {proof.plans.toLocaleString("en-US")}
                </strong>
                <span>survey plans</span>
              </div>
              <div className="stat">
                <strong className="count" data-to={proof.beacons}>
                  {proof.beacons.toLocaleString("en-US")}
                </strong>
                <span>survey beacons</span>
              </div>
              <div className="stat">
                <strong className="count" data-to={proof.regions}>
                  {proof.regions}
                </strong>
                <span>{proof.regionsLabel}</span>
              </div>
            </div>
            <p className="proof-foot">
              <b>{proof.places.join(" · ")}</b> Since {proof.since}.
            </p>
          </div>
        </section>
        <section className="belief-section">
          <div className="section-wrap belief-inner">
            <p className="eyebrow">THE BIGGER PICTURE</p>
            <h2>
              We want African industries
              <br />
              to <span>work better.</span>
            </h2>
            <p>
              Our ambition is to build trusted digital solutions that make
              industries across Africa more connected, accessible and efficient.
              We are starting with the problems we know, learning from the
              people closest to them, and building toward what is possible.
            </p>
            <Link className="button button-light" href="/v4/our-story">
              More about TwoNode <span>↗</span>
            </Link>
            <div className="belief-decoration" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>
        <section className="section-wrap contact-section" id="contact">
          <div>
            <p className="eyebrow">LET&#39;S TALK</p>
            <h2>
              Have a problem
              <br />
              <span>worth solving?</span>
            </h2>
          </div>
          <div className="contact-copy">
            <p>
              If you work in an industry where information gets lost, processes
              break down or people struggle to work together, we&#39;d like to
              understand the challenge.
            </p>
            <a
              className="button button-primary"
              href="mailto:info@twonodetechnologies.com?subject=Let's%20talk%20about%20an%20industry%20problem"
            >
              Start a conversation <span>↗</span>
            </a>
            <p className="contact-line">
              <a href="tel:+2349160002740">+234 916 0002 740</a>
              <a href="mailto:info@twonodetechnologies.com">
                info@twonodetechnologies.com
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <MotionLayer />
    </>
  );
}

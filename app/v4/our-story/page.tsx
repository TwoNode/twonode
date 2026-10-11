import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { MotionLayer } from "../components/MotionLayer";

export const metadata: Metadata = {
  title: "Our Story — TwoNode Technologies",
  description:
    "The story of TwoNode Technologies: starting with surveying, learning from industry, and building solutions for a more connected future.",
};

export default function V4StoryPage() {
  return (
    <>
      <SiteHeader current="story" />
      <main>
        <section className="story-hero section-wrap">
          <p className="eyebrow">
            <span className="eyebrow-dot"></span> OUR STORY
          </p>
          <h1>
            We started with problems <span>we knew.</span>
          </h1>
          <p className="story-lede">
            TwoNode began with firsthand experience in surveying and geospatial
            work, and a simple observation: the way an industry operates can
            create problems that technology alone does not solve.
          </p>
          <div className="story-hero-note">
            <span className="tiny-line"></span>
            <span>
              Our story is still being written, one meaningful solution at a
              time.
            </span>
          </div>
        </section>
        <section className="story-body">
          <div className="section-wrap story-content">
            <aside className="story-index">
              <span>IN THIS STORY</span>
              <a href="#beginning">01 — Where it began</a>
              <a href="#learning">02 — What we learned</a>
              <a href="#growth">03 — How we&#39;re growing</a>
              <a href="#beliefs">04 — What we believe</a>
              <a href="#future">05 — Where we&#39;re going</a>
            </aside>
            <div className="story-article">
              <section id="beginning">
                <p className="eyebrow">01 / WHERE IT BEGAN</p>
                <h2>We understood the work before we tried to change it.</h2>
                <p>
                  Surveying involves more than taking measurements and producing
                  plans. It involves people, records, professional processes and
                  institutions that depend on accurate information.
                </p>
                <p>
                  We knew this world. We understood the work that went into
                  producing survey plans and the importance of being able to
                  retrieve, verify and share the information they contain.
                </p>
                <p>
                  We also understood the friction that arose when records and
                  processes were spread across paper files, separate systems and
                  multiple stakeholders.
                </p>
                <p>
                  The challenge was not simply that some tasks were manual. It
                  was that important information did not always move as easily
                  or reliably as the work required.
                </p>
                <div className="story-pullquote">
                  <span>“</span>
                  <p>
                    We began exploring how digital tools could make survey plan
                    records more accessible and useful. That exploration became
                    Surfboard.
                  </p>
                </div>
              </section>
              <section id="learning">
                <p className="eyebrow">02 / WHAT WE LEARNED</p>
                <h2>Solving one problem revealed a bigger opportunity.</h2>
                <p>
                  Working on Surfboard reinforced an important lesson: an
                  industry&#39;s challenges rarely exist in isolation.
                </p>
                <p>
                  A survey plan is connected to the professional who prepares
                  it, the institution that receives it, the people who need to
                  retrieve it and the decisions that depend on it.
                </p>
                <p>
                  Improving the record itself matters. Understanding the
                  relationships around that record matters too.
                </p>
                <p>
                  That insight continues to influence how we build. A digital
                  product may be the right starting point. In another situation,
                  a better process or stronger industry collaboration may be
                  just as important.
                </p>
                <p>
                  We focus on understanding what the problem requires before
                  deciding what the solution should be.
                </p>
              </section>
              <section id="growth">
                <p className="eyebrow">03 / HOW WE&#39;RE GROWING</p>
                <h2>From surveying to a broader way of building.</h2>
                <p>
                  Surveying gave us a place to begin. It did not define the
                  limits of what we could build.
                </p>
                <div className="story-project">
                  <span className="project-number">01</span>
                  <div>
                    <h3>Surfboard</h3>
                    <p>
                      Making survey plan records more accessible, searchable and
                      useful to the professionals who work with them.
                    </p>
                  </div>
                </div>
                <div className="story-project">
                  <span className="project-number">02</span>
                  <div>
                    <h3>Geospatial Builders Conference (GBC)</h3>
                    <p>
                      Creating opportunities for people in the geospatial
                      industry to meet, exchange ideas and build relationships.
                    </p>
                  </div>
                </div>
                <div className="story-project">
                  <span className="project-number">03</span>
                  <div>
                    <h3>REVA</h3>
                    <p>
                      Extending our work into real estate, where access to
                      reliable property information plays an important role in
                      decision-making.
                    </p>
                  </div>
                </div>
                <p>
                  These projects serve different needs. Their connection is the
                  way we approach them: understand the industry, identify what
                  is missing, and build around what people actually need.
                </p>
              </section>
              <section id="beliefs">
                <p className="eyebrow">04 / WHAT WE BELIEVE</p>
                <h2>The way we build matters.</h2>
                <div className="belief-row">
                  <span>01</span>
                  <div>
                    <h3>Understand deeply.</h3>
                    <p>
                      We begin with the people doing the work, the systems they
                      rely on and the challenges they face.
                    </p>
                  </div>
                </div>
                <div className="belief-row">
                  <span>02</span>
                  <div>
                    <h3>Build simply.</h3>
                    <p>
                      We aim to make complicated processes easier to navigate
                      through practical, thoughtful solutions.
                    </p>
                  </div>
                </div>
                <div className="belief-row">
                  <span>03</span>
                  <div>
                    <h3>Connect the pieces.</h3>
                    <p>
                      We look for opportunities to bring people, information and
                      systems together where the gaps between them create
                      friction.
                    </p>
                  </div>
                </div>
              </section>
              <section id="future">
                <p className="eyebrow">05 / WHERE WE&#39;RE GOING</p>
                <h2>Building for the industries that move Africa forward.</h2>
                <p>
                  We see opportunities across African industries to make
                  information more accessible, processes more efficient and
                  relationships between stakeholders more productive.
                </p>
                <p>
                  Realising that opportunity takes more than building software.
                  It requires an understanding of local realities, trust in the
                  people doing the work, and a willingness to keep learning as
                  industries evolve.
                </p>
                <p>That is the kind of company we are building at TwoNode.</p>
                <div className="story-pullquote future-quote">
                  <span>“</span>
                  <p>
                    Our ambition is to help African industries become more
                    connected, accessible and efficient, one meaningful solution
                    at a time.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
        <section className="story-cta">
          <div className="section-wrap story-cta-inner">
            <p className="eyebrow">THE WORK CONTINUES</p>
            <h2>There is more work to do.</h2>
            <p>
              More problems to understand. More solutions to build. More
              connections to make.
            </p>
            <a
              className="button button-light"
              href="mailto:info@twonodetechnologies.com"
            >
              Build with TwoNode <span>↗</span>
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <MotionLayer />
    </>
  );
}

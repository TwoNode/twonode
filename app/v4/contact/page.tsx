import type { Metadata } from "next";
import { PageShell } from "../components/PageShell";

export const metadata: Metadata = {
  title: "Contact — TwoNode Technologies",
  description:
    "Whether you want to work with TwoNode or join us in building, the fastest way to reach us is directly.",
};

export default function V4ContactPage() {
  return (
    <PageShell current="contact">
      <section className="story-hero section-wrap">
        <p className="eyebrow">
          <span className="eyebrow-dot"></span> BUILD WITH US
        </p>
        <h1>
          Let&apos;s talk about <span>your industry.</span>
        </h1>
        <p className="story-lede">
          Whether you want to work with TwoNode or join us in building, the
          fastest way to reach us is directly.
        </p>
      </section>
      <section className="section-wrap v4-rows">
        <div className="v4-row">
          <p className="eyebrow">EMAIL</p>
          <a
            className="v4-big-link"
            href="mailto:info@twonodetechnologies.com?subject=Let's%20talk%20about%20an%20industry%20problem"
          >
            info@twonodetechnologies.com
          </a>
        </div>
        <div className="v4-row">
          <p className="eyebrow">PHONE</p>
          <a className="v4-big-link" href="tel:+2349160002740">
            +234 916 0002 740
          </a>
        </div>
        <div className="v4-row">
          <p className="eyebrow">COMPANY</p>
          <p className="v4-plain">
            TwoNode Technologies Ltd. · RC NO.: 7742902
            <br />
            58 Kudirat Abiola way, Oregun, Lagos State, Nigeria.
          </p>
        </div>
      </section>
    </PageShell>
  );
}

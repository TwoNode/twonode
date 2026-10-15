import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import EmbeddedMap from "./GbcFrame";

export default function GdcFrame() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <EmbeddedMap />
      <Footer />
    </section>
  );
}

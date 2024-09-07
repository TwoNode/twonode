import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import EmbedSurvey from "./GbcFrame";

export default function GdcFrame() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <EmbedSurvey />
      <Footer />
    </section>
  );
}

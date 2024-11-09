import Navbar from "@/components/Navbar";
import { SignUpforOurSurvey } from "@/components/HomeComponents";
import Footer from "@/components/Footer";
import EffortlessTracking from "../../../components/EffortlessTracking";
import TakeAViewofOurGallery from "../../../components/TakeAViewofOurGallery";
import YouTubeEmbed from "@/components/YouTubeEmbed";

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <YouTubeEmbed />

      <TakeAViewofOurGallery />
      {/* Sign Up for Our Survey Data Management */}
      <EffortlessTracking />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

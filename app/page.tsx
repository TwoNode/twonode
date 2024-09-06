import Navbar from "@/components/Navbar";
import Banner from "@/components/Banner";
import {
  SignUpforOurSurvey,
  BelovedClientsSayings,
  FeaturedNews,
} from "@/components/HomeComponents";
import { FrequentlyAskedQuestions } from "@/components/FrequentlyAskedQuestions";
import { ReachOutToUs } from "@/components/ReachOutToUs";
import { Footer } from "@/components/Footer";
import { SurveyTrustFirms } from "@/components/SurveyTrustFirms";
import { EfficientGISSolutions } from "@/components/EfficientGISSolutions";
import { OurGallery } from "@/components/OurGallery";
import { Revolutionizing } from "@/components/Revolutionizing";
import { DemystifyingGIS } from "@/components/DemystifyingGIS";

export default function Home() {
  return (
    <section>
      <Navbar />
      <Banner />

      {/* Survey Firms that Trust our Solution */}
      <SurveyTrustFirms />

      {/* Efficient GIS Solutions */}
      <EfficientGISSolutions />

      {/* Revolutionizing industry Based Geospatial Solutions */}
      <Revolutionizing />

      <DemystifyingGIS />

      {/* Sign Up for Our Survey Data Management */}
      <SignUpforOurSurvey url="signup" />

      {/* What Our Beloved Clients Are Saying */}
      <BelovedClientsSayings />

      {/* Featured News */}
      <FeaturedNews />

      {/* Take A View of Our Gallery */}
      <OurGallery />

      {/* Frequently Asked Questions */}
      <FrequentlyAskedQuestions />

      {/* You Can Reach Out To Us! */}
      <ReachOutToUs />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

import Navbar from "@/components/Navbar";
import {
  SignUpforOurSurvey,
  BelovedClientsSayings,
} from "@/components/HomeComponents";
import { FrequentlyAskedQuestions } from "@/components/FrequentlyAskedQuestions";
import { ReachOutToUs } from "@/components/ReachOutToUs";
import Footer from "@/components/Footer";
import Aboutbanner from "./Aboutbanner";
import { SurveyTrustFirms } from "@/components/SurveyTrustFirms";

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <Aboutbanner />

      {/* Survey Firms that Trust our Solution */}
      <SurveyTrustFirms />

      {/* Sign Up for Our Survey Data Management */}
      <SignUpforOurSurvey url="signup" />

      {/* What Our Beloved Clients Are Saying */}
      <BelovedClientsSayings />
      {/* Featured News */}

      {/* Frequently Asked Questions */}
      <FrequentlyAskedQuestions />

      {/* You Can Reach Out To Us! */}
      <ReachOutToUs />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

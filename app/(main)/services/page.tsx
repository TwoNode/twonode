import Navbar from "@/components/Navbar";
import {
  SignUpforOurSurvey,
  BelovedClientsSayings,
} from "@/components/HomeComponents";
import { FrequentlyAskedQuestions } from "@/components/FrequentlyAskedQuestions";
import { ReachOutToUs } from "@/components/ReachOutToUs";
import Footer from "@/components/Footer";
import SurfBoard from "../../../components/SurfBoard";
import { SurveyTrustFirms } from "@/components/SurveyTrustFirms";
import { ServicesRevolutionizing } from "./Revol";

export default function Home() {
  return (
    <section className="">
      <Navbar />
      <ServicesRevolutionizing />

      <SurfBoard activeLink={false} />

      {/* Survey Firms that Trust our Solution */}
      <SurveyTrustFirms />

      {/* Sign Up for Our Survey Data Management */}
      <SignUpforOurSurvey />

      {/* What Our Beloved Clients Are Saying */}
      <BelovedClientsSayings />

      {/* Frequently Asked Questions */}
      <FrequentlyAskedQuestions />

      {/* You Can Reach Out To Us! */}
      <ReachOutToUs />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

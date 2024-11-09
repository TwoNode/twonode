import Navbar from "@/components/Navbar";
import SurfBoardSubscriptionPlans from "./SurfBoardSubscriptionPlans";
import EffortlessTracking from "./EffortlessTracking";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <SurfBoardSubscriptionPlans />
      <EffortlessTracking />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

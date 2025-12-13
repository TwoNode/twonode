import Navbar from "@/components/Navbar";
import SurfBoardSubscriptionPlans from "./SurfBoardSubscriptionPlans";
import EffortlessTracking from "./EffortlessTracking";
import Footer from "@/components/Footer";
import ProductShowcase from "@/components/ProductShowcase";

export default function SignupPage() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <ProductShowcase activeProduct="reva" />
      <SurfBoardSubscriptionPlans />
      <EffortlessTracking />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

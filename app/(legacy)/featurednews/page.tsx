import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeaturedNews from "./FeaturedNews";

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <FeaturedNews />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

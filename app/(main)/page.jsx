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
import { CarouselImageSlider } from "@/components/CarouselImageSlider";
import { OurGallery } from "@/components/OurGallery";
import { Revolutionizing } from "@/components/Revolutionizing";
import { DemystifyingGIS } from "@/components/DemystifyingGIS";
import { BLOGS } from "./featurednews/FeaturedNews";

export default function Home() {
  const GbcData = BLOGS.slice(0, 4).map((blog, index) => ({
    number: index + 1,
    title: blog.title,
    desc: blog.body, // Taking the first line of the body for description
    img: blog.images[0] || "", // Taking the first image as the representative image
  }));

  return (
    <section>
      <Navbar />
      <Banner />

      {/* Survey Firms that Trust our Solution */}
      <SurveyTrustFirms />

      {/* Efficient GIS Solutions */}
      <CarouselImageSlider
        data={GbcData}
        link={{ title: "View More", url: "/featurednews" }}
        title1="Geospatial Builders Course 1.0"
        title2="GBC 1.0 event was a Success"
      />

      {/* <CarouselImageSlider /> */}

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

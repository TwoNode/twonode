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
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const GbcData = BLOGS.slice(0, 4).map((blog, index) => ({
    number: index + 1,
    title: blog.title,
    desc: blog.body,
    img: blog.images[1] || "",
  }));

  return (
    <section>
      <Navbar />
      <Banner />

      {/* Survey Firms that Trust our Solution */}
      <SurveyTrustFirms />

      {/* Our Projects */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Surfboard Project */}
            <Link href="/surfboard" className="group block">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                <div className="relative h-48 bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center">
                  <Image 
                    src="/surfboard/surf_logo.png" 
                    alt="Surfboard Project" 
                    width={120} 
                    height={120}
                    className="object-contain"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-blue-600">Surfboard</h3>
                  <p className="text-gray-600">Advanced subscription management and billing platform with powerful analytics and reporting features.</p>
                  <div className="mt-4 text-blue-600 font-medium">Learn more →</div>
                </div>
              </div>
            </Link>

            {/* Reva Project */}
            <Link href="/reva" className="group block">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                <div className="relative h-48 bg-gradient-to-r from-green-500 to-green-700 flex items-center justify-center">
                  <Image 
                    src="/reva/revaLogo.png" 
                    alt="Reva Project" 
                    width={180} 
                    height={100}
                    className="object-contain"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-green-600">Reva</h3>
                  <p className="text-gray-600">Comprehensive due diligence and property assessment platform for real estate professionals.</p>
                  <div className="mt-4 text-green-600 font-medium">Learn more →</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

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

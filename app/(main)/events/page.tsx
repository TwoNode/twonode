import Navbar from "@/components/Navbar";
import { SignUpforOurSurvey } from "@/components/HomeComponents";
import { Footer } from "@/components/Footer";
import { Gbc } from "./Gbc";
import { GbcBanner } from "./GbcBanner";
import Link from "next/link";

type Event = {
  name: string;
  link?: string;
  src: string;
};

const events: Event[] = [
  { name: "GBC 1.0", src: "gbcBanner.png", link: "/events" },
  { name: "GBC 2.0", src: "gbcBanner.png", link: "/gbc" },
  // Add more events here as needed
];

function EventList() {
  return (
    <section className="mywrapper my-12 px-4">
      <h2 className="text-3xl font-extrabold text-center mb-8 bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Events
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event, idx) => (
          <div
            key={idx}
            className="relative rounded-xl overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300"
          >
            <img
              src={event.src}
              alt={event.name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-70" />
            <div className="absolute bottom-4 left-4 text-white">
              {event.link ? (
                <Link
                  href={event.link}
                  className="text-xl font-semibold hover:underline"
                >
                  {event.name}
                </Link>
              ) : (
                <span className="text-xl font-semibold">{event.name}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <section className="bg-teal-5000">
      <Navbar />
      <EventList />
      <GbcBanner />
      <Gbc />
      {/* Sign Up for Our Survey Data Management */}
      <SignUpforOurSurvey url="https://survey123.arcgis.com/share/a0d72b89d7a14eae9da311fdae8fc5c5" />

      {/* Footer Section */}
      <Footer />
    </section>
  );
}

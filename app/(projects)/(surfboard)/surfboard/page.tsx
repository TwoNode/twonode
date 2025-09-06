import React from "react";
import Link from "next/link";
import Image from "next/image";

const modules = [
  {
    title: "Smart Form",
    description:
      "Guided form for survey plan uploads, CSV import, map preview, and attribute entry. Streamlines submissions for surveyors and land administrators.",
  },
  {
    title: "Survey Plan Viewer",
    description:
      "Interactive map viewer (ArcGIS JS API + Google Maps API) for visualizing, searching, and querying survey plans and parcel boundaries. Provides clear visualizations and structured land intelligence.",
  },
  {
    title: "Dashboard",
    description:
      "Central hub for managing plans, viewing recent activity, and accessing analytics. Derive strategic insights from aggregated spatial datasets.",
  },
  {
    title: "SP-Code Verification",
    description:
      "Protects survey plans with unique QR codes for public verification, ensuring authenticity.",
  },
];

export default function SurfboardLandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <header className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center py-4 px-0 sm:px-6 md:px-0">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Image
            src="/SURFBOARD_Logo.png"
            alt="Surfboard Logo"
            width={50}
            height={50}
            className="rounded-full"
          />
          <span className="text-2xl font-bold text-blue-900">SURFBOARD</span>
        </div>
        <nav className="w-full sm:w-auto">
          <ul className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 items-center">
            <li>
              <Link href="#about">
                <span className="text-blue-700 hover:text-blue-900 font-medium transition">
                  About
                </span>
              </Link>
            </li>
            <li>
              <Link href="#features">
                <span className="text-blue-700 hover:text-blue-900 font-medium transition">
                  Features
                </span>
              </Link>
            </li>
            <li>
              <Link href="/surfboard/dashboard">
                <span className="px-4 py-2 bg-blue-700 text-white rounded-md shadow hover:bg-blue-800 transition font-semibold">
                  Sign In
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <section className="max-w-4xl w-full text-center mb-16 mt-8 px-4 sm:px-0">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-blue-900 leading-tight mb-6">
          Surfboard: Geospatial Intelligence
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-blue-700 leading-relaxed mb-8">
          Unlock the value of cadastral and geospatial data. Surfboard empowers
          surveyors, planners, and land administrators with actionable insights
          and structured land intelligence.
        </p>
        <Link href="/surfboard/dashboard">
          <span className="inline-block px-8 py-3 sm:px-10 sm:py-4 bg-blue-700 text-white rounded-lg shadow-xl hover:bg-blue-800 transition duration-300 ease-in-out transform hover:scale-105 font-semibold text-lg sm:text-xl">
            Get Started Today
          </span>
        </Link>
      </section>

      <section id="about" className="max-w-5xl w-full mb-16 px-4 sm:px-0">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-900 text-center mb-10">
          Empowering Land Professionals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="text-base sm:text-lg text-blue-800 space-y-4">
            <p>
              As land data becomes central to administration and planning,
              Surfboard provides essential tools.
            </p>
            <p>
              Our platform helps you manage survey submissions, visualize plans,
              and derive strategic insights from spatial datasets.
            </p>
          </div>
          <div className="flex justify-center mt-8 md:mt-0">
            <div className="bg-blue-200 p-6 sm:p-8 rounded-lg shadow-inner w-full max-w-sm">
              <p className="text-blue-700 text-center italic text-base sm:text-lg">
                "Transforming raw survey data into actionable intelligence."
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl w-full mb-16 px-4 sm:px-0"
      >
        <h2 className="sr-only">Core Features</h2>
        {modules.map((mod) => (
          <div
            key={mod.title}
            className="bg-white rounded-xl shadow-lg p-6 sm:p-7 text-left border border-blue-100 hover:shadow-xl transition duration-200 ease-in-out transform hover:-translate-y-1 flex flex-col items-start"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2 sm:mb-3">
              {mod.title}
            </h3>
            <p className="text-sm sm:text-base text-blue-700 flex-grow">
              {mod.description}
            </p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl w-full text-center mb-12 px-4 sm:px-0">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-6">
          Elevate Your Land Management.
        </h2>
        <p className="text-base sm:text-lg text-blue-700 mb-8">
          Join professionals leveraging Surfboard for smarter, more efficient
          geospatial intelligence.
        </p>
        <Link href="/surfboard/dashboard">
          <span className="inline-block px-8 py-3 sm:px-10 sm:py-4 bg-green-600 text-white rounded-lg shadow-xl hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 font-semibold text-lg sm:text-xl">
            Explore Features
          </span>
        </Link>
      </section>

      <footer className="mt-16 w-full max-w-6xl border-t border-blue-200 pt-8 text-blue-700 text-center md:text-left grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-0">
        <div className="mb-6 md:mb-0">
          <h4 className="font-bold text-blue-900 mb-2">Contact Us</h4>
          <p className="text-sm sm:text-base">
            58 Kudirat Abiola Way, Oregun, Ikeja, Lagos State.
          </p>
          <p className="text-sm sm:text-base">
            Email:{" "}
            <a
              href="mailto:info@twonodetechnologies.com"
              className="text-blue-600 hover:underline"
            >
              info@twonodetechnologies.com
            </a>
          </p>
          <p className="text-sm sm:text-base">
            Phone:{" "}
            <a
              href="tel:+2349160002740"
              className="text-blue-600 hover:underline"
            >
              +234-916-0002-740
            </a>
          </p>
        </div>
        <div className="mb-6 md:mb-0">
          <h4 className="font-bold text-blue-900 mb-2">Quick Links</h4>
          <ul className="space-y-1">
            <li>
              <Link href="#about">
                <span className="text-blue-600 hover:underline text-sm sm:text-base">
                  About Surfboard
                </span>
              </Link>
            </li>
            <li>
              <Link href="#features">
                <span className="text-blue-600 hover:underline text-sm sm:text-base">
                  Features
                </span>
              </Link>
            </li>
            <li>
              <Link href="/surfboard/dashboard">
                <span className="text-blue-600 hover:underline text-sm sm:text-base">
                  Dashboard
                </span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-blue-900 mb-2">TwoNode Technologies</h4>
          <p className="text-sm sm:text-base">
            Innovative geospatial solutions for a smarter future.
          </p>
          <p className="mt-4 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} TwoNode Technologies. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

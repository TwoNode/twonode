import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Target,
  Eye,
  Sparkles,
  Users2,
  Globe2,
  TrendingUp,
} from "lucide-react";

export default async function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-6 left-6 z-10">
          <Link href="/gbc2" className="flex items-center text-white/80 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-1">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
              About GBC
            </h1>
            <p className="text-xl md:text-2xl text-gray-100 leading-relaxed">
              Nigeria's premier annual platform dedicated to unlocking the power
              of geospatial technology as capital
            </p>
          </div>
        </div>
      </section>

      {/* What is GBC */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-4xl font-bold">What is GBC?</h2>
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                The <strong>Geospatial Builders Conference (GBC)</strong> is
                Nigeria's premier annual platform dedicated to unlocking the
                power of geospatial technology as capital. It is not just a
                gathering of geospatial professionals—it is a cross-industry hub
                where innovators, decision makers, and investors come together
                to explore how geospatial intelligence can solve real-world
                problems and create measurable economic value.
              </p>

              <p className="text-xl text-gray-700 leading-relaxed">
                Unlike traditional conferences that focus on abstract
                possibilities, GBC showcases
                <strong> practical applications</strong>,{" "}
                <strong>solution-driven projects</strong>, and the{" "}
                <strong>tangible impact</strong> of geospatial innovation across
                multiple industries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why GBC Matters */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-4xl font-bold">Why GBC Matters</h2>
            </div>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                For too long, conversations around geospatial technology have
                centered on
                <em> what it can do</em>. GBC shifts the focus to{" "}
                <strong>what is already being done</strong>—practical
                applications, solution-driven projects, and the impact of
                geospatial innovation across industries.
              </p>

              <p>
                At GBC, we showcase not only technology, but also the{" "}
                <strong>economic</strong>,<strong> social</strong>, and{" "}
                <strong>governance value</strong> it brings to sectors such as:
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-8">
                {[
                  "Energy & Oil/Gas",
                  "Real Estate & Infrastructure",
                  "Transportation",
                  "Telecommunication",
                  "Agriculture & Food Security",
                  "Health & Fitness",
                  "Finance & Insurance",
                  "Governance & Urban Development",
                ].map((sector, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm"
                  >
                    <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    <span className="font-medium">{sector}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A Platform for Connection */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users2 className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-4xl font-bold">A Platform for Connection</h2>
            </div>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                GBC is about <strong>visibility and collaboration</strong>. It
                creates a stage where geospatial innovators meet professionals,
                executives, and investors from other industries. The goal is
                simple: to inspire adoption, spark partnerships, and accelerate
                the growth of Nigeria's geospatial ecosystem.
              </p>

              <div className="grid md:grid-cols-3 gap-6 my-12">
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Connect</h3>
                  <p className="text-gray-600">
                    Innovators with adopters across industries
                  </p>
                </div>

                <div className="text-center p-6 bg-indigo-50 rounded-xl">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Showcase</h3>
                  <p className="text-gray-600">
                    Groundbreaking projects and solutions
                  </p>
                </div>

                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Accelerate</h3>
                  <p className="text-gray-600">
                    Growth of geospatial ecosystem
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Vision */}
      <section className="py-24 bg-linear-to-br from-gray-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-4xl font-bold">The Vision</h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed">
              <p className="text-xl">
                We believe{" "}
                <strong>geospatial capital is the next frontier</strong> for
                development in Nigeria and beyond. GBC provides the platform to:
              </p>

              <ul className="space-y-4 my-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Connect innovators with adopters</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Showcase groundbreaking projects</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>Highlight economic opportunities</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span>
                    Build a sustainable future powered by geospatial
                    intelligence
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Looking Ahead */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Looking Ahead</h2>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                Each edition of GBC builds on the last, creating a growing{" "}
                <strong>knowledge base</strong>,<strong> network</strong>, and{" "}
                <strong>marketplace</strong> for geospatial solutions. The
                conference is designed to evolve with the ecosystem, ensuring
                that every year, participants gain fresh insights, meaningful
                connections, and actionable outcomes.
              </p>

              <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg my-8">
                <p className="text-xl font-semibold text-purple-900 mb-2">
                  GBC 2.0 Theme
                </p>
                <p className="text-2xl font-bold text-purple-600 mb-2">
                  Geospatial Capital: A Catalyst for Inclusive Growth
                </p>
                <p className="text-lg text-purple-800">
                  Sub-Theme: Driving Transformation in Land Administration and
                  Energy
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-linear-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Be Part of the Movement
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join us at GBC 2.0 and help shape the future of geospatial
            technology in Nigeria
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/gbc2/tickets">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-purple-600 hover:bg-gray-100"
              >
                Get Your Ticket
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/gbc2/contact">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/10 text-white border-white hover:bg-white/20"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

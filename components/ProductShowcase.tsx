"use client";

import Link from "next/link";

interface ProductShowcaseProps {
  activeProduct?: 'reva' | 'surfboard';
}

const ProductShowcase = ({ activeProduct }: ProductShowcaseProps) => {
  return (
    <section className="mywrapper w-full py-[75px] bg-white">
      <div className="flex flex-col items-center gap-16">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-950 mb-6">
            Our Products
          </h2>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
            Discover our suite of powerful tools designed to enhance your workflow and data management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
          {/* REVA Card */}
          <div className={`p-8 rounded-xl border-2 transition-all duration-300 ${activeProduct === 'reva' ? 'border-sky-950 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}>
            <div className="flex flex-col items-center h-full">
              <h3 className="text-2xl font-bold text-center mb-4">REVA</h3>
              <p className="text-neutral-600 text-center mb-6 flex-grow">
                Advanced data visualization and analysis tool for comprehensive insights.
              </p>
              <Link 
                href="/reva"
                className={`px-6 py-3 rounded-full font-semibold transition-colors ${activeProduct === 'reva' ? 'bg-sky-950 text-white hover:bg-sky-800' : 'bg-white text-sky-950 border-2 border-sky-950 hover:bg-sky-50'}`}
              >
                {activeProduct === 'reva' ? 'Using REVA' : 'Learn More'}
              </Link>
            </div>
          </div>

          {/* SURFBOARD Card */}
          <div className={`p-8 rounded-xl border-2 transition-all duration-300 ${activeProduct === 'surfboard' ? 'border-sky-950 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}>
            <div className="flex flex-col items-center h-full">
              <h3 className="text-2xl font-bold text-center mb-4">SURFBOARD</h3>
              <p className="text-neutral-600 text-center mb-6 flex-grow">
                Geographic Information System solution for survey-based data management and insights.
              </p>
              <Link 
                href="/surfboard"
                className={`px-6 py-3 rounded-full font-semibold transition-colors ${activeProduct === 'surfboard' ? 'bg-sky-950 text-white hover:bg-sky-800' : 'bg-white text-sky-950 border-2 border-sky-950 hover:bg-sky-50'}`}
              >
                {activeProduct === 'surfboard' ? 'Using SURFBOARD' : 'Learn More'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;

"use client";

import { Download, Share2 } from "lucide-react";
import { format } from "date-fns";

export default function CertificateClient({ ticket }: { ticket: any }) {
  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Controls - Hidden when printing */}
      <div className="flex gap-4 mb-8 print:hidden">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Download className="w-5 h-5" />
          Download PDF
        </button>
      </div>

      {/* Certificate Container */}
      <div 
        className="relative w-full aspect-[1.414] bg-white shadow-2xl overflow-hidden print:shadow-none print:w-[297mm] print:h-[210mm] print:m-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(243,244,246,0.95) 100%),
            url('/gbc2/gbc2DarkLogo.png')
          `,
          backgroundSize: 'cover, 50%',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Border Layer */}
        <div className="absolute inset-4 border-[3px] border-purple-800/20 p-2 pointer-events-none">
          <div className="w-full h-full border border-purple-800/10" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-12 sm:p-20 text-center">
          
          <img src="/gbc2/gbc2DarkLogo.png" alt="GBC 2.0" className="h-16 sm:h-24 mb-6 sm:mb-8 object-contain opacity-90" />
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-purple-900 mb-4 sm:mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            CERTIFICATE OF ATTENDANCE
          </h1>
          
          <p className="text-gray-600 text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 font-light">
            This is to certify that
          </p>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-8 sm:mb-12 border-b-2 border-purple-500 pb-2 inline-block px-12">
            {ticket.name}
          </h2>
          
          <p className="text-gray-700 text-base sm:text-lg md:text-xl max-w-3xl leading-relaxed mb-12 sm:mb-20 font-medium">
            has actively participated in the <span className="font-bold text-purple-900">Geospatial Builders Conference (GBC) 2.0</span>, exploring the theme "Geospatial Capital: A Catalyst for Inclusive Growth".
          </p>
          
          <div className="w-full flex justify-between items-end px-12 sm:px-24 mt-auto">
            <div className="text-center">
              <div className="border-t border-gray-400 w-48 mb-2"></div>
              <p className="font-semibold text-gray-800">Date</p>
              <p className="text-sm text-gray-600">{ticket.checkedInAt ? format(new Date(ticket.checkedInAt), "MMMM do, yyyy") : format(new Date(), "MMMM do, yyyy")}</p>
            </div>
            
            <div className="text-center">
              <div className="border-t border-gray-400 w-48 mb-2"></div>
              <p className="font-semibold text-gray-800">Organizing Committee</p>
              <p className="text-sm text-gray-600">GBC By TwoNode Technologies</p>
            </div>
          </div>
          
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white;
          }
        }
      `}</style>
    </div>
  );
}

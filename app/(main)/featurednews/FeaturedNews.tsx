// File: FeaturedNews.jsx

import React from "react";
import { FacebookIcon, InstagramIcon, LinkedInIcon, TwitterIcon } from "./svgs";

export const BLOGS = [
  {
    date: "November 23rd, 2024",
    location: "Marriott Hotel, Ikeja, Lagos",
    title: "GBC 1.0: Demystifying GIS for Surveyors",
    body: `
      The Geospatial Builders Course (GBC) is a program dedicated to fostering 
      geospatial capacity-building across industries. This maiden edition, themed 
      "Demystifying GIS for Surveyors," brought together surveyors and geospatial 
      enthusiasts for a day of learning, innovation, and connection.
    `,
    highlights: [
      "Analyze millions of parcels across the U.S.",
      "Conduct real-time analyses on a national scale.",
      "Empower land conservation and ownership initiatives.",
    ],
    keyTakeaway:
      "GIS equips surveyors with the tools to make smarter, faster decisions at scale, transforming the way we understand and interact with the world.",
    images: [
      "/gbc/expSession/img_1.jpg",
      "/gbc/expSession/img_2.jpg",
      "/gbc/expSession/img_3.jpg",
      "/gbc/expSession/img_4.jpg",
      "/gbc/expSession/img_5.jpg",
      "/gbc/expSession/img_6.jpg",
    ],
  },
  {
    title: "Technical Session: Building the Future of Surveying",
    body: `
      The Technical Session was a masterclass in redefining the future of surveying 
      and geospatial innovation. It started with the basics—delving into the GIS 
      Dictionary and Coordinate Systems to establish a common language.
    `,
    details: [
      {
        category: "For Government Surveyors",
        points: [
          "Demonstrated how simple processes like drafting could generate vital reports, including Certificates of Deposit and Land Information Reports.",
          "Highlighted how survey plans should align with state frameworks for greater accuracy and utility.",
        ],
      },
      {
        category: "For Private Surveyors",
        points: [
          "Emphasized the untapped potential of archived survey plans as historical records of land use and ownership.",
          "Encouraged surveyors to evolve beyond legal practice into value-added service providers, driving innovation in land management.",
        ],
      },
    ],
    images: [
      "/gbc/homePage/img_1.jpg",
      "/gbc/homePage/img_2.jpg",
      "/gbc/homePage/img_3.jpg",
    ],
  },
  {
    title: "💻 Hands-On Practical",
    body: `
      Participants used ArcGIS Pro to access real-world datasets from Victoria Garden 
      City Estate, Lekki. Key activities included:
    `,
    highlights: [
      "Extracting parcels and transforming vertices into points.",
      "Creating relationship classes to link parcels and vertices.",
      "Developing a web application to query properties by size, street, or ownership.",
    ],
    keyTakeaway:
      "This exercise showcased how survey drawings can become dynamic databases, revolutionizing property searches and enabling smarter decision-making.",

    images: [
      "/gbc/website/img_1.jpg",
      "/gbc/website/img_2.jpg",
      "/gbc/website/img_3.jpg",
      "/gbc/website/img_4.jpg",
      "/gbc/website/img_5.jpg",
      "/gbc/website/img_6.jpg",
    ],
  },
  {
    title: "😜 Fun Moments and Networking",
    body: `
      The day wasn’t all work! Attendees enjoyed engaging fun moments, building 
      connections, and sharing ideas that promise to shape the future of surveying 
      and geospatial technology.
    `,
    images: [
      "/gbc/funAndNet/img_1.jpg",
      "/gbc/funAndNet/img_2.jpg",
      "/gbc/funAndNet/img_3.jpg",
      "/gbc/funAndNet/img_4.jpg",
      "/gbc/funAndNet/img_5.jpg",
      "/gbc/funAndNet/img_6.jpg",
    ],
  },

  {
    date: "Wednesday, July 17, 2024 · 2 Min Read",
    title:
      "Same Subscription with More Capabilities with ArcGIS Pro and ArcOnline Licenses",
    body: `
      TwoNode Technologies is thrilled to announce a long-term partnership with 
      Sambus Geospatial, the official distributor for ESRI products. This partnership 
      is to provide ultra-specific capabilities beyond your imagination.
    `,
    highlights: [
      "ArcGIS Pro Advanced, extensions, and dozens of ready-to-use apps.",
      "ArcGIS Living Atlas of the World with maps and data on thousands of topics, including access to foundational content from Esri.",
      "Software updates.",
      "Unlimited access to self-paced e-learning through the Esri Training website.",
    ],
    images: ["/fea1.png", "/fea2.png", "/fea3.png"],
    author: "TwoNode Technologies",
  },
];

const FeaturedNews = () => {
  return (
    <div className="mywrapper min-h-screen py-16 bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-blue-900 text-xl font-medium">
          <div className="w-6 h-1 bg-blue-900"></div>
          Our News
        </div>
        <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-900 mt-4">
          Featured News
        </h1>
      </div>

      {/* Blog Section */}
      <div className="max-w-6xl w-full space-y-16">
        {BLOGS.map((blog, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-xl shadow-lg flex flex-col gap-6"
          >
            {/* Date and Location */}
            {blog.date && blog.location && (
              <div className="text-lg text-gray-600 font-medium">
                {blog.date} - {blog.location}
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl lg:text-4xl font-bold text-gray-900">
              {blog.title}
            </h2>

            {/* Body */}
            <p className="text-gray-700 text-lg leading-relaxed">{blog.body}</p>

            {/* Highlights */}
            {blog.highlights && (
              <ul className="list-disc list-inside text-gray-700 space-y-2 pl-5">
                {blog.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>
            )}

            {/* Key Takeaway */}
            {blog.keyTakeaway && (
              <blockquote className="text-lg font-medium text-blue-900 italic border-l-4 border-blue-900 pl-4">
                💡 Key Takeaway: {blog.keyTakeaway}
              </blockquote>
            )}

            {/* Details */}
            {blog.details &&
              blog.details.map((detail, i) => (
                <div key={i}>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {detail.category}
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 pl-5">
                    {detail.points.map((point, j) => (
                      <li key={j}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}

            {/* Images */}
            {blog.images && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 items-center">
                {blog.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Blog image ${i + 1}`}
                    className="rounded-lg max-w-full object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Social and Footer */}
      <div className="mt-20 flex flex-col items-center space-y-6">
        <div className="flex gap-6">
          <LinkedInIcon />
          <FacebookIcon />
          <TwitterIcon />
          <InstagramIcon />
        </div>
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} TwoNode Technologies. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default FeaturedNews;

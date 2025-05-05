import React from "react";
import { Welcome } from "./components/Welcome";
import Link from "next/link";

const Home = () => {
  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <Welcome />

      <div className="propertiesSection mt-8">
        <h2 className="text-2xl font-bold mb-4">Recent Properties</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              id: "1",
              name: "Property A",
              description: "A beautiful property in the city center.",
              status: "Active",
              totalCost: 500000,
            },
            {
              id: "2",
              name: "Property B",
              description: "A serene property near the lake.",
              status: "Pending",
              totalCost: 300000,
            },
          ].map((property) => (
            <li
              key={property.id}
              className="p-4 border rounded-lg shadow-sm hover:shadow-md transition bg-white"
            >
              <h3 className="text-lg font-semibold mb-2">{property.name}</h3>
              <p className="text-sm text-gray-600 mb-2">
                {property.description}
              </p>
              <p className="text-sm mb-1">
                <strong>Status:</strong> {property.status}
              </p>
              <p className="text-sm">
                <strong>Total Cost:</strong> $
                {property.totalCost.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <Link
            href="/reva/dashboard/allrequests"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View More
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

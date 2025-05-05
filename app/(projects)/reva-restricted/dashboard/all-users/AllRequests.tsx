import React from "react";
import { getUserProperties } from "../../actions/dbActions";
import Link from "next/link";

export async function AllRequests() {
  const { data, success } = await getUserProperties();

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <h1 className="text-2xl font-bold mb-4">
        All Requests &nbsp; <small> ( {success && data?.length} )</small>
      </h1>

      <section className="info-section mb-6 flex flex-col gap-4">
        <div className="property-card border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
          <Link
            href={
              "/reva/dashboard/viewdetails?trxref=REVA_2244bbbc5&reference=REVA_2244bbbc5"
            }
          >
            <h2 className="text-xl font-semibold mb-2">Demo Property 1</h2>
          </Link>
          <p className="text-gray-600 text-sm mb-2">
            This is a demo description for property 1.
          </p>
          <p className="text-gray-500 text-xs mb-2">
            <strong>Status:</strong> Available
          </p>
          <p className="text-gray-500 text-xs mb-2">
            <strong>Address:</strong> 123 Demo Street, Demo City
          </p>
          <p className="text-gray-500 text-xs mb-2">
            <strong>Total Cost:</strong> $100,000.00
          </p>
          <div className="documents mt-2">
            <h3 className="text-sm font-medium mb-1">Supporting Documents:</h3>
            <ul className="list-disc list-inside text-gray-500 text-xs">
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Document 1
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Document 2
                </a>
              </li>
            </ul>
          </div>
        </div>

        {success && data ? (
          <>
            {data?.map((property: any) => (
              <div
                key={property.id}
                className="property-card border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="property-card border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                  <Link
                    href={`/reva/dashboard/viewdetails?trxref=REVA_2244bbbc5&reference=REVA_2244bbbc5`}
                  >
                    <h2 className="text-xl font-semibold mb-2">
                      {property.name || property.description || "Untitled Property"}
                    </h2>
                  </Link>
                  <p className="text-gray-600 text-sm mb-2">
                    {property.comments || "No comments provided."}
                  </p>
                  <p className="text-gray-500 text-xs mb-2">
                    <strong>Status:</strong> {property.status || "Unknown"}
                  </p>
                  <p className="text-gray-500 text-xs mb-2">
                    <strong>Address:</strong> {property.address}
                  </p>
                  <p className="text-gray-500 text-xs mb-2">
                    <strong>Total Cost:</strong> $
                    {property.totalCost.toLocaleString()}
                  </p>
                  <div className="documents mt-2">
                    <h3 className="text-sm font-medium mb-1">
                      Supporting Documents:
                    </h3>
                    {/* <ul className="list-disc list-inside text-gray-500 text-xs">
                  {property.supportingDocumentsUrls?.length > 0 ? (
                    property.supportingDocumentsUrls.map((url, index) => (
                      <li key={index}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Document {index + 1}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>No documents uploaded.</li>
                  )}
                </ul> */}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <p>No properties found.</p>
        )}
      </section>
    </div>
  );
}

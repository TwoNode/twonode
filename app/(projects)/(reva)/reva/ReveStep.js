import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LGA_PRICES = {
  AGEGE: 30000,
  "AJEROMI-IFELODUN": 30000,
  ALIMOSHO: 30000,
  "AMUWO-ODOFIN": 30000,
  APAPA: 50000,
  BADAGRY: 30000,
  EPE: 30000,
  "ETI - OSA": 50000,
  "IBEJU LEKKI": 50000,
  "IFAKO-IJAIYE": 40000,
  IKEJA: 50000,
  IKORODU: 30000,
  KOSOFE: 40000,
  "LAGOS- ISLAND": 50000,
  "LAGOS MAINLAND": 40000,
  MUSHIN: 40000,
  OJO: 30000,
  "OSHODI/ISOLO": 40000,
  SHOMOLU: 40000,
  SURULERE: 50000,
};

export default function RevaForm() {
  const [formData, setFormData] = useState({
    email: "",
    requester: "",
    location: "",
    address: "",
    lga: "",
    documents: null,
    comments: "",
    totalCost: 0,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, documents: e.target.files[0] });
  };

  const fetchCoordinates = async () => {
    if (!formData.address) return alert("Please enter the address first");
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${formData.address}&key=YOUR_API_KEY`
    );
    const data = await response.json();
    if (data.results[0]) {
      const location = data.results[0].geometry.location;
      const lat = location.lat;
      const lng = location.lng;
      setFormData({ ...formData, location: `${lat}, ${lng}` });
      await fetchLGA(lat, lng);
    }
  };

  const fetchLGA = async (lat, lng) => {
    const response = await fetch(
      `https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/1/query?where=1%3D1&geometry=${lng}%2C${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=LGA&f=json`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const lga = data.features[0].attributes.LGA;
      setFormData({
        ...formData,
        lga: lga,
        totalCost: LGA_PRICES[lga.toUpperCase()] || 0,
      });
    } else {
      alert("LGA not found for this location.");
    }
  };

  return (
    <Card className="p-6 max-w-lg mx-auto mt-10 bg-white shadow-lg rounded-2xl">
      <CardContent>
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">REVA Due Diligence Request</h2>
        <p className="text-center text-gray-500 mb-6 italic">"Your due diligence just got intelligent"</p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-600 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="input w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Who's Requesting</label>
            <input
              type="text"
              name="requester"
              placeholder="Enter requester's name"
              className="input w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Address of the Property</label>
            <input
              type="text"
              name="address"
              placeholder="Enter the property address"
              className="input w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleInputChange}
            />
            <Button className="mt-2" onClick={fetchCoordinates}>
              Get Location
            </Button>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Location</label>
            <input
              type="text"
              name="location"
              placeholder="Latitude, Longitude"
              className="input w-full p-3 border rounded-lg bg-gray-100 cursor-not-allowed"
              value={formData.location}
              readOnly
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">LGA of Property</label>
            <input
              type="text"
              name="lga"
              placeholder="LGA will be auto-filled"
              className="input w-full p-3 border rounded-lg bg-gray-100 cursor-not-allowed"
              value={formData.lga}
              readOnly
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Supporting Documents</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="input w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Other Comments</label>
            <textarea
              name="comments"
              placeholder="Enter additional comments"
              className="input w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Total Cost</label>
            <input
              type="number"
              name="totalCost"
              className="input w-full p-3 border rounded-lg bg-gray-100 cursor-not-allowed"
              value={formData.totalCost}
              readOnly
            />
          </div>

          <Button className="mt-4 w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

interface Location {
  lat: number; // Latitude of the property
  lng: number; // Longitude of the property
}

export interface PropertySchemaType extends Document {
  reference: string; // Unique identifier for the property
  name: string | null; // Name of the property
  description: string | null; // Description of the property
  status: string | null; // Status of the property request
  statusMessage: string | null; // Status message of the property request
  error: string | null; // Error message if any

  user: mongoose.Types.ObjectId; // Reference to the User associated with the property

  address: string; // Property address
  location: Location | null; // Location can be null if not set
  lga: string; // Local Government Area (LGA)

  totalCost: number; // Total cost in NGN
  documentsUrls: string[]; // Array of URLs for supporting documents
  comments?: string; // Optional additional comments
}

const LocationSchema = new Schema<Location>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
});

const PropertySchema = new Schema<PropertySchemaType>({
  reference: { type: String, required: true, unique: true },
  name: { type: String, default: null },
  description: { type: String, default: null },
  status: { type: String, default: null },
  statusMessage: { type: String, default: null },
  error: { type: String, default: null },

  user: { type: Schema.Types.ObjectId, ref: "User", required: true },

  address: { type: String, required: true },
  location: { type: LocationSchema, default: null },
  lga: { type: String, required: true },

  totalCost: { type: Number, required: true },
  documentsUrls: { type: [String], required: true },
  comments: { type: String, default: null },
});

export default mongoose.model<PropertySchemaType>("Property", PropertySchema);

export interface OneTimeUserPropertySchemaType extends Document {
  reference: string; // Unique identifier for the property
  requester: string | null; // Name of the property
  description: string | null; // Description of the property
  status: string | null; // Status of the property request
  paymentStatus: string | null; // Payment status of the property request
  statusMessage: string | null; // Status message of the property request
  error: string | null; // Error message if any

  email: string; // Email of the one-time user
  userPhoneNumber?: string | null; // Phone number of the one-time user

  address: string; // Property address
  location: Location | null; // Location can be null if not set
  lga: string; // Local Government Area (LGA)

  totalCost: number; // Total cost in NGN
  documentsUrls: string[]; // Array of URLs for supporting documents
  comments?: string; // Optional additional comments
}

const generateShortUUID = () => uuidv4().replace(/-/g, "").slice(0, 10);

const OneTimeUserPropertySchema = new Schema<OneTimeUserPropertySchemaType>({
  reference: { type: String, default: generateShortUUID, unique: true },
  requester: { type: String, default: "" },
  description: { type: String, default: null },
  status: { type: String, default: null },
  paymentStatus: { type: String, default: null },
  statusMessage: { type: String, default: null },
  error: { type: String, default: null },

  email: { type: String, required: true },
  userPhoneNumber: { type: String, required: false },

  address: { type: String, required: true },
  location: { type: LocationSchema, default: null },
  lga: { type: String, required: true },

  totalCost: { type: Number, required: true },
  documentsUrls: { type: [String], required: true },
  comments: { type: String, default: null },
});

export const OneTimeUserPropertyModel =
  mongoose.model<OneTimeUserPropertySchemaType>(
    "OneTimeUserProperty",
    OneTimeUserPropertySchema
  );

import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserSchemaType {
  id: string; // Unique identifier for the user
  name: string; // Name of the requester
  status: string; // Status of the user request
  email: string; // Email of the user
  emailVerified: boolean; // Email verification status
  phoneNumber: string; // Phone number of the user
  createdAt: string; // Date when the user was created
  updatedAt: string; // Date when the user was last updated
}

// Define the Mongoose schema
const UserSchema: Schema = new Schema<UserSchemaType>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, required: true },
  phoneNumber: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

// Create the Mongoose model
const UserModel: Model<UserSchemaType & Document> = mongoose.model<
  UserSchemaType & Document
>("User", UserSchema);

export default UserModel;

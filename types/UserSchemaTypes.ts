// /home/roji/UBUNTU/RTG_CODE/NextJS/twonodes/types/UserSchemaTypes.ts
interface Location {
  lat: number; // Latitude of the property
  lng: number; // Longitude of the property
}

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

export interface PropertySchemaType {
  id: string; // Unique identifier for the property
  name: string | null; // Name of the property
  status: string | null; // Status of the property request
  statusMessage: string | null; // Status message of the property request
  error: string | null; // Error message if any

  user: UserSchemaType; // User associated with the property

  address: string; // Property address
  location: Location | null; // Location can be null if not set
  lga: string; // Local Government Area (LGA)

  totalCost: number; // Total cost in NGN
  supportingDocumentsUrls: string[]; // Array of URLs for supporting documents
  comments?: string; // Optional additional comments
}

// import * as yup from "yup";

// const UserSchema: yup.SchemaOf<UserSchemaType> = yup.object().shape({
//   email: yup
//     .string()
//     .email("Invalid email address")
//     .required("Email is required"),
//   requester: yup
//     .string()
//     .min(2, "Requester name must be at least 2 characters")
//     .required("Requester name is required"),
//   address: yup
//     .string()
//     .min(5, "Address must be at least 5 characters")
//     .required("Property address is required"),
//   location: yup
//     .object()
//     .shape({
//       lat: yup.number().required("Latitude is required"),
//       lng: yup.number().required("Longitude is required"),
//     })
//     .nullable()
//     .required("Location is required"),
//   lga: yup.string().required("LGA is required"),
//   totalCost: yup
//     .number()
//     .min(1, "Total cost must be at least 1")
//     .required("Total cost is required"),
//   supportingDocuments: yup
//     .mixed()
//     .test(
//       "fileType",
//       "Only valid file types are allowed",
//       (value) => !value || Array.from(value).every((file) => file instanceof File)
//     ),
//   additionalComments: yup.string().nullable(),
// });

// export default UserSchema;

// export type UserSchemaType = yup.InferType<typeof UserSchema>;

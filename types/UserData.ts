// types/UserData.ts
export type UserData = {
  id: string;
  email: string;
  name?: string | null;
  role: "USER" | "ADMIN";
};
export type UserRole = "USER" | "ADMIN";

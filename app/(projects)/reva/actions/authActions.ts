// // app/actions/auth.ts
// "use server";

// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import prisma from "@/lib/prisma";
// import { UserData } from "@/types/UserData";
// import { randomUUID } from "crypto";
// import { addMinutes } from "date-fns";

// // Validate environment variables
// const JWT_SECRET = process.env.JWT_SECRET;
// const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "12", 10);

// if (!JWT_SECRET || JWT_SECRET === "your_jwt_secret") {
//   throw new Error(
//     "JWT_SECRET is not properly configured in environment variables"
//   );
// }

// if (SALT_ROUNDS < 10 || SALT_ROUNDS > 15) {
//   throw new Error("SALT_ROUNDS should be between 10 and 15");
// }

// // Types
// export type AuthResponse<T = undefined> = {
//   success: boolean;
//   message: string;
//   data?: T;
// };

// // Security Utilities
// const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);
// const comparePassword = (input: string, hash: string) =>
//   bcrypt.compare(input, hash);

// // Auth Functions
// export const registerUser = async (
//   email: string,
//   password: string,
//   name?: string
// ): Promise<AuthResponse<UserData>> => {
//   try {
//     // Validate password strength
//     if (password.length < 8) {
//       return {
//         success: false,
//         message: "Password must be at least 8 characters",
//       };
//     }

//     const existingUser = await prisma.user.findUnique({ where: { email } });

//     if (existingUser) {
//       return { success: false, message: "Email already in use" };
//     }

//     const hashedPassword = await hashPassword(password);
//     const user = await prisma.user.create({
//       data: { email, password: hashedPassword, name },
//     });

//     const token = randomUUID();
//     await prisma.verificationToken.create({
//       data: {
//         token,
//         userId: user.id,
//         expiresAt: addMinutes(new Date(), 15),
//       },
//     });

//     // In production, you would send this via email
//     console.log(
//       "Verify your email →",
//       `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
//     );

//     const data: UserData = {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//     };

//     return {
//       success: true,
//       message: "User registered. Please verify your email.",
//       data,
//     };
//   } catch (error) {
//     console.error("Register Error:", error);
//     return { success: false, message: "Registration failed" };
//   }
// };

// export const verifyEmail = async (
//   email: string,
//   token: string
// ): Promise<AuthResponse> => {
//   try {
//     const tokenRecord = await prisma.verificationToken.findUnique({
//       where: { token },
//     });

//     if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
//       return { success: false, message: "Invalid or expired token" };
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: tokenRecord.userId },
//     });

//     if (!user || user.email !== email) {
//       return { success: false, message: "Email does not match the token" };
//     }

//     await prisma.user.update({
//       where: { id: tokenRecord.userId },
//       data: { updatedAt: new Date(), emailVerified: true }, // Store verification timestamp
//     });

//     await prisma.verificationToken.delete({ where: { token } });

//     return { success: true, message: "Email verified successfully" };
//   } catch (error) {
//     console.error("Verify Email Error:", error);
//     return { success: false, message: "Verification failed" };
//   }
// };

// export const loginUser = async (
//   email: string,
//   password: string
// ): Promise<AuthResponse<{ token: string; user: UserData }>> => {
//   try {
//     // Check rate limiting first (pseudo-code - implement your rate limiting solution)
//     // if (await isRateLimited(email)) {
//     //   return { success: false, message: "Too many attempts. Please try again later." };
//     // }

//     const user = await prisma.user.findUnique({ where: { email } });

//     // Timing attack protection - always compare passwords
//     const dummyHash = await hashPassword("dummy_value_for_comparison");
//     const passwordMatch = user
//       ? await comparePassword(password, user.password)
//       : await comparePassword(password, dummyHash);

//     if (!user || !passwordMatch) {
//       // await trackFailedAttempt(email); // Implement for rate limiting
//       return { success: false, message: "Invalid email or password" };
//     }

//     if (!user.emailVerified) {
//       return {
//         success: false,
//         message: "Please verify your email before logging in",
//       };
//     }

//     // Include additional security claims in JWT
//     const token = jwt.sign(
//       {
//         userId: user.id,
//         email: user.email,
//         // Include password hash to invalidate token if password changes
//         securityStamp: await hashPassword(user.password.substring(0, 10)),
//         // Additional security claims
//         iss: process.env.NEXT_PUBLIC_APP_URL,
//         aud: "authenticated-users",
//       },
//       JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     const userData: UserData = {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//     };

//     return {
//       success: true,
//       message: "Login successful",
//       data: { token, user: userData },
//     };
//   } catch (error) {
//     console.error("Login Error:", error);
//     return { success: false, message: "Login failed" };
//   }
// };

// export const changePassword = async (
//   userId: string,
//   oldPassword: string,
//   newPassword: string
// ): Promise<AuthResponse> => {
//   try {
//     if (newPassword.length < 8) {
//       return {
//         success: false,
//         message: "Password must be at least 8 characters",
//       };
//     }

//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user || !(await comparePassword(oldPassword, user.password))) {
//       return { success: false, message: "Old password is incorrect" };
//     }

//     // Prevent reusing old passwords
//     if (await comparePassword(newPassword, user.password)) {
//       return {
//         success: false,
//         message: "New password cannot be the same as old password",
//       };
//     }

//     const newHashed = await hashPassword(newPassword);
//     await prisma.user.update({
//       where: { id: userId },
//       data: { password: newHashed },
//     });

//     return { success: true, message: "Password changed successfully" };
//   } catch (error) {
//     console.error("Change Password Error:", error);
//     return { success: false, message: "Change password failed" };
//   }
// };

// export const forgotPassword = async (
//   email: string
// ): Promise<AuthResponse<{ resetToken: string }>> => {
//   try {
//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       // Don't reveal whether user exists
//       return {
//         success: true,
//         message:
//           "If an account exists with this email, a reset link has been sent",
//         data: { resetToken: "" },
//       };
//     }

//     // Delete any existing reset tokens for this user
//     await prisma.passwordResetToken.deleteMany({
//       where: { userId: user.id },
//     });

//     const resetToken = randomUUID();
//     await prisma.passwordResetToken.create({
//       data: {
//         token: resetToken,
//         userId: user.id,
//         expiresAt: addMinutes(new Date(), 15),
//       },
//     });

//     // In production, you would send this via email
//     console.log(
//       "RESET LINK →",
//       `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
//     );

//     return {
//       success: true,
//       message: "Password reset link generated",
//       data: { resetToken },
//     };
//   } catch (error) {
//     console.error("Forgot Password Error:", error);
//     return { success: false, message: "Failed to generate reset token" };
//   }
// };

// export const resetPassword = async (
//   token: string,
//   newPassword: string
// ): Promise<AuthResponse> => {
//   try {
//     if (newPassword.length < 8) {
//       return {
//         success: false,
//         message: "Password must be at least 8 characters",
//       };
//     }

//     const tokenRecord = await prisma.passwordResetToken.findUnique({
//       where: { token },
//       include: { user: true },
//     });

//     if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
//       return { success: false, message: "Invalid or expired token" };
//     }

//     // Check if new password is different from current
//     if (await comparePassword(newPassword, tokenRecord.user.password)) {
//       return {
//         success: false,
//         message: "New password cannot be the same as current password",
//       };
//     }

//     const hashed = await hashPassword(newPassword);
//     await prisma.user.update({
//       where: { id: tokenRecord.userId },
//       data: { password: hashed },
//     });

//     // Delete the used token
//     await prisma.passwordResetToken.delete({ where: { token } });

//     return { success: true, message: "Password has been reset successfully" };
//   } catch (error) {
//     console.error("Reset Password Error:", error);
//     return { success: false, message: "Reset password failed" };
//   }
// };

// export const logoutUser = async (userId: string): Promise<AuthResponse> => {
//   try {
//     // Invalidate the JWT token (if using a token-based auth system)
//     // This could involve blacklisting the token or simply removing it from client storage
//     // For this example, we'll just return a success message
//     return { success: true, message: "Logged out successfully" };
//   } catch (error) {
//     console.error("Logout Error:", error);
//     return { success: false, message: "Logout failed" };
//   }
// };

// // Add to your auth.ts file

// /**
//  * Verifies a token for password change operations
//  * @param token The token to verify (either JWT session token or password reset token)
//  * @param tokenType The type of token to verify ('session' or 'reset')
//  * @returns AuthResponse with user data if verification succeeds
//  */
// export const verifyPasswordChangeToken = async (
//   token: string,
//   tokenType: "session" | "reset"
// ): Promise<AuthResponse<{ userId: string; email: string }>> => {
//   try {
//     if (tokenType === "session") {
//       // Verify JWT session token
//       const decoded = jwt.verify(token, JWT_SECRET) as {
//         userId: string;
//         email: string;
//         securityStamp: string;
//       };

//       // Fetch user from database
//       const user = await prisma.user.findUnique({
//         where: { id: decoded.userId },
//       });

//       if (!user) {
//         return { success: false, message: "User not found" };
//       }

//       // Verify security stamp (invalidates token if password changed)
//       const currentStamp = await hashPassword(user.password.substring(0, 10));
//       if (decoded.securityStamp !== currentStamp) {
//         return { success: false, message: "Session expired" };
//       }

//       // Verify email matches (additional security check)
//       if (decoded.email !== user.email) {
//         return { success: false, message: "Invalid token" };
//       }

//       return {
//         success: true,
//         message: "Token is valid",
//         data: { userId: user.id, email: user.email },
//       };
//     } else {
//       // Verify password reset token
//       const tokenRecord = await prisma.passwordResetToken.findUnique({
//         where: { token },
//         include: { user: true },
//       });

//       if (!tokenRecord) {
//         return { success: false, message: "Invalid token" };
//       }

//       if (tokenRecord.expiresAt < new Date()) {
//         // Clean up expired token
//         await prisma.passwordResetToken.delete({ where: { token } });
//         return { success: false, message: "Token expired" };
//       }

//       return {
//         success: true,
//         message: "Token is valid",
//         data: {
//           userId: tokenRecord.user.id,
//           email: tokenRecord.user.email,
//         },
//       };
//     }
//   } catch (error) {
//     console.error("Token Verification Error:", error);

//     if (error instanceof jwt.TokenExpiredError) {
//       return { success: false, message: "Token expired" };
//     }
//     if (error instanceof jwt.JsonWebTokenError) {
//       return { success: false, message: "Invalid token" };
//     }

//     return { success: false, message: "Token verification failed" };
//   }
// };

// export const changePasswordWithSession = async (
//   sessionToken: string,
//   oldPassword: string,
//   newPassword: string
// ) => {
//   // First verify the session token
//   const verification = await verifyPasswordChangeToken(sessionToken, "session");

//   if (!verification.success) {
//     return verification;
//   }

//   // Then proceed with password change
//   return await changePassword(
//     verification.data!.userId!,
//     oldPassword,
//     newPassword
//   );
// };

// export const resetPasswordWithToken = async (
//   resetToken: string,
//   newPassword: string
// ) => {
//   // First verify the reset token
//   const verification = await verifyPasswordChangeToken(resetToken, "reset");

//   if (!verification.success) {
//     return verification;
//   }

//   // Then proceed with password reset (no old password required)
//   const hashed = await hashPassword(newPassword);
//   await prisma.user.update({
//     where: { id: verification.data!.userId },
//     data: { password: hashed },
//   });

//   // Delete the used token
//   await prisma.passwordResetToken.delete({ where: { token: resetToken } });

//   return { success: true, message: "Password has been reset successfully" };
// };

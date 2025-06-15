"use client";

import React from "react";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { setCookie } from "@/lib/utils";

import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

// Improved schema with additional validation rules
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .regex(/[a-zA-Z0-9]/, { message: "Password must be alphanumeric" }),
});

export default function LoginPreview() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Login Form Submitted: ", values);
    setLoading(true); // Start loading

    try {
      // Assuming an async login function
      toast.success(
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      );

      console.log("Form Data Submitted: ", values);
      // sessionStorage.setItem("isLoggedIn", "true"); // Set isLoggedIn in session storage
      setCookie("isLoggedIn", "true", 1); // Set the isLoggedIn cookie (expires in 1 day)

      // Simulate an API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Remove this in production
      router.push("/reva/dashboard"); // Redirect to dashboard after registration
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  }

  return (
    <div className="flex flex-col min-h-[90vh] h-full w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">REVA Login</CardTitle>
          <CardDescription>
            An Error occured during login, please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between gap-4">
          <LoginLink postLoginRedirectURL="/api/auth/success/reva">
            <Button>Login</Button>
          </LoginLink>
          <RegisterLink postLoginRedirectURL="/api/auth/success/reva">
            <Button>Sign up</Button>
          </RegisterLink>
        </CardContent>
      </Card>
    </div>
  );
}

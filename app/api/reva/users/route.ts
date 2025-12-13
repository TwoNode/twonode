import {
  UserSchemaType,
  PropertySchemaType,
} from "../../../../types/UserSchemaTypes";

import { NextResponse } from "next/server";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { zodForm } from "@/lib/zodForm";
// import { zodFormSchema } from "@/lib/zodFormSchema";
// import { zodFormSchemaType } from "@/lib/zodFormSchema";
// import { zodFormType } from "@/lib/zodForm";

let users: { id: number; name: string }[] = []; // In-memory storage for demonstration

// GET request to fetch users
export async function GET() {
  return NextResponse.json(users);
}

// POST request to add a new user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    users.push({ id, name });
    return NextResponse.json({
      message: "User added successfully",
      user: { id, name },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

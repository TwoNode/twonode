"use server";

import { promises as fs } from "fs";
import path from "path";

export async function getSecureHtml() {
  // You can add authentication logic here if needed
  const filePath = path.join(process.cwd(), "extras", "SR355.html");
  try {
    const html = await fs.readFile(filePath, "utf-8");
    return html;
  } catch (e) {
    return null;
  }
}

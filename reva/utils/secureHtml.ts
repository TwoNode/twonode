import { promises as fs } from "fs";
import path from "path";

/** Migrated from reva-restricted/actions/otherActions.ts — a plain filesystem read, no auth/DB involved, so no service/route needed, just relocated out of the "use server" actions/ tree it never belonged in. */
export async function getSecureHtml() {
  const filePath = path.join(process.cwd(), "extras", "SR355.html");
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

import { redirect } from "next/navigation";

export default function CodIndexRedirect() {
  redirect("/surfboard-restricted/dashboard/cod/batches");
}

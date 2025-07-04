import { Suspense } from "react";
import RedirectComponent from "./RedirectPage";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function RedirectPage({ searchParams }: PageProps) {
  const redirectionPage =
    (typeof searchParams.redirectionPage === "string"
      ? searchParams.redirectionPage
      : Array.isArray(searchParams.redirectionPage)
      ? searchParams.redirectionPage[0]
      : null) || "/";

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RedirectComponent redirectionPage={redirectionPage} />
    </Suspense>
  );
}

import { Suspense } from "react";
import RedirectComponent from "./RedirectPage";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams:
    | { [key: string]: string | string[] | undefined }
    | Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectionPage =
    (typeof params?.redirectionPage === "string"
      ? params.redirectionPage
      : Array.isArray(params.redirectionPage)
        ? params.redirectionPage[0]
        : null) || "/";

  return (
    <Suspense
      fallback={<LoadingSpinner variant="fullscreen" text="Redirecting..." />}
    >
      <RedirectComponent redirectionPage={redirectionPage} />
    </Suspense>
  );
}

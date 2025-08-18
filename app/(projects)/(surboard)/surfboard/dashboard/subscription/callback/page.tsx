// import { verifySubscription } from "@/app/(projects)/(surboard)/actions/paystackActions";
// import { redirect } from "next/navigation";
import SubscriptionCallback from "./SubCallback";

export default async function SubscriptionCallbackPage({
  searchParams,
}: {
  searchParams: { reference: string };
}) {
  const reference = searchParams?.reference || "";
  // const res = await verifySubscription(reference);

  // if (res?.success)
  //   return redirect("/surfboard/dashboard/subscription?success=true");
  // else
  //   return redirect(
  //     "/surfboard/dashboard/subscription?error=payment_verification_failed"
  //   );

  return <SubscriptionCallback reference={reference} />;
}

// import { verifySubscription } from "@/app/(projects)/(surfboard)/actions/paystackActions";
// import { redirect } from "next/navigation";
import SubscriptionCallback from "./SubCallback";

export default async function SubscriptionCallbackPage({
  searchParams,
}: {
  searchParams: { reference: string };
}) {
  const { reference } = await searchParams;
  // const res = await verifySubscription(reference);

  // if (res?.success)
  //   return redirect("/surfboard/dashboard/subscription?success=true");
  // else
  //   return redirect(
  //     "/surfboard/dashboard/subscription?error=payment_verification_failed"
  //   );

  return <SubscriptionCallback reference={reference} />;
}

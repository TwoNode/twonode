import { Metadata } from "next";
import SubscriptionManager from "./SubscriptionManager";
import { getUserActiveSubscription } from "@/app/(projects)/(surfboard)/actions/subscriptionActions";

export const metadata: Metadata = {
  title: "Subscription Plans | Surfboard",
  description: "Manage your Surfboard subscription",
};

export default async function SubscriptionPage({
  searchParams: { success, error },
}: {
  searchParams: { success?: string; error?: string };
}) {
  const sub = await getUserActiveSubscription();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SubscriptionManager searchParams={{ success, error }} sub={sub} />
      </div>
    </div>
  );
}

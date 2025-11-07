import { Metadata } from "next";
import SubscriptionManager from "./SubscriptionManager";

export const metadata: Metadata = {
  title: "Subscription Plans | Surfboard",
  description: "Manage your Surfboard subscription",
};

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SubscriptionManager />
      </div>
    </div>
  );
}

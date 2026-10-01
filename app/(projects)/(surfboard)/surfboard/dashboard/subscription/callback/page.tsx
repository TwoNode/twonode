import SubscriptionCallback from "./SubCallback";

export default async function SubscriptionCallbackPage({
  searchParams,
}: {
  searchParams: { reference: string };
}) {
  const { reference } = await searchParams;

  return <SubscriptionCallback reference={reference} />;
}

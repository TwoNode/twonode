import { Welcome } from "@/reva/components/shared";

export default function AdminWelcome() {
  return (
    <Welcome
      dashboardType="admin"
      customGreeting="Welcome, Admin"
      customInstructions={[
        "Start by reviewing user requests or managing the system to stay on top of operations.",
        "Have questions? Our team is here to help don't hesitate to reach out!",
      ]}
    />
  );
}

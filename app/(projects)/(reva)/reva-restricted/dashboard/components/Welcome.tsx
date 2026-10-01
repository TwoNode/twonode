import { Welcome } from "@/reva/components/shared";

/** The admin home's panel — personalised from the signed-in admin's own session. */
export default function AdminWelcome() {
  return <Welcome dashboardType="admin" />;
}

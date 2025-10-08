import { getAllSurfPlans } from "../../../actions/surfboardActions";
import MaplibreMultiPlansWithSearch from "./MaplibreMultiPlans";
import PlansMapClient from "./PlansMapClient";

export default async function SurfMapViewerPage() {
  const res = await getAllSurfPlans();

  if (!res.success || !res.data) {
    return <div className="p-6 text-red-600">Failed to load plans.</div>;
  }

  return <PlansMapClient plansRaw={res.data.plans} />;
}

import React from "react";
import LiftPlan from "./LiftPlan";
import { loadLogs } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Summer Lifting Plan | Adam Bechtold",
  description:
    "A phone-first logger for a 4-day Upper/Lower hypertrophy block — log sets, run the rest timer, and reference how to run the program.",
};

/**
 * Summer Lifting Plan page — loads saved set logs and renders the logger.
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function LiftPage() {
  const initialLogs = await loadLogs();
  return <LiftPlan initialLogs={initialLogs} />;
}

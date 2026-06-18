import React from "react";
import LiftPlan from "./LiftPlan";

export const metadata = {
  title: "Summer Lifting Plan | Adam Bechtold",
  description:
    "A phone-first logger for a 4-day Upper/Lower hypertrophy block — log sets, run the rest timer, and reference how to run the program.",
};

/**
 * Summer Lifting Plan page.
 * @return {React.ReactElement} The rendered page.
 */
export default function LiftPage() {
  return <LiftPlan />;
}

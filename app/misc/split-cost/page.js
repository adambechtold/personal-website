import React from "react";
import CostSplitter from "./CostSplitter";

export const metadata = {
  title: "Split Cost",
  description: "Split a cost among people by shares.",
};

/**
 * Split cost page component.
 * @return {React.ReactElement} The rendered page.
 */
export default function SplitCostPage() {
  return <CostSplitter />;
}

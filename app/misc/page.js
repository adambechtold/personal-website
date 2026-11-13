import React from "react";
import Link from "next/link";
import styles from "./tools.module.css";
import Card from "../components/ui/Card";

export const metadata = {
  title: "Tools",
  description: "Personal tools.",
  robots: { index: false, follow: false },
};

const TOOLS = [
  {
    href: "/misc/lift",
    emoji: "🏋️",
    name: "Lift",
    description: "Workout plan and set logging.",
  },
  {
    href: "/misc/split-cost",
    emoji: "💸",
    name: "Split Cost",
    description: "Track and settle shared trip expenses.",
  },
];

/**
 * Tools index — lets the user choose which personal tool to open.
 * @return {React.ReactElement} The rendered page.
 */
export default function ToolsIndexPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Tools</h1>
        <div className={styles.toolList}>
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className={styles.toolLink}>
              <Card className={styles.toolCard}>
                <div className={styles.toolName}>
                  {tool.emoji} {tool.name}
                </div>
                <div className={styles.toolDescription}>{tool.description}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

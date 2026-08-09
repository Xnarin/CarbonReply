import type { ReactNode } from "react";
import { ProjectTransitionPanel } from "@/components/project-transition-panel";

// Next.js templates remount on each child-route navigation, which makes the
// entry transition run for upload → review → report.
export default function ProjectTemplate({ children }: { children: ReactNode }) {
  return <ProjectTransitionPanel>{children}</ProjectTransitionPanel>;
}

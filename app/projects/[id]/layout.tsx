import type { ReactNode } from "react";
import { ProjectTransitionPanel } from "@/components/project-transition-panel";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <ProjectTransitionPanel>{children}</ProjectTransitionPanel>;
}

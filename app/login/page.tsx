import { AuthForm } from "@/components/auth-form";
import { ProjectTransitionPanel } from "@/components/project-transition-panel";

export default function LoginPage() {
  return <ProjectTransitionPanel><main className="auth-page"><AuthForm mode="login" /></main></ProjectTransitionPanel>;
}

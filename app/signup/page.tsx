import { AuthForm } from "@/components/auth-form";
import { ProjectTransitionPanel } from "@/components/project-transition-panel";

export default function SignupPage() {
  return <ProjectTransitionPanel><main className="auth-page"><AuthForm mode="signup" /></main></ProjectTransitionPanel>;
}

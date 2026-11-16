import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up — MindFlow" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />;
}

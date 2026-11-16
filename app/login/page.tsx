import { login } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in — MindFlow" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      action={login}
      initialError={
        error === "confirmation_failed"
          ? "That confirmation link is invalid or has expired. Please try again."
          : undefined
      }
    />
  );
}

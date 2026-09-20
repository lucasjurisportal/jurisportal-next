import { Suspense } from "react";
import { SecurityCodeForm } from "@/components/auth/SecurityCodeForm";
import { SecurityPageShell } from "@/components/auth/SecurityPageShell";

export default function VerifyEmailPage() {
  return <SecurityPageShell><Suspense fallback={<div>Carregando...</div>}><SecurityCodeForm mode="email-verification" /></Suspense></SecurityPageShell>;
}

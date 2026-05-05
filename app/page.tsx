import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSafeServerSession } from "@/lib/auth";
import { LOGIN_PAGE_DYNAMIC, readLoginFeatures } from "@/lib/read-login-features";

export const dynamic = LOGIN_PAGE_DYNAMIC;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; register?: string }>;
}) {
  const session = await getSafeServerSession();
  if (session) {
    redirect("/playground");
  }

  const sp = await searchParams;
  return (
    <LoginForm
      features={await readLoginFeatures()}
      passwordResetSuccess={sp.reset === "ok"}
      startWithRegister={sp.register === "1" || sp.register === "true"}
    />
  );
}

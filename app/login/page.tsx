import { redirect } from "next/navigation";

/** Совместимость со старыми ссылками `/login` → главная с тем же query. */
export default async function LoginLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(sp)) {
    if (raw === undefined) continue;
    const vals = Array.isArray(raw) ? raw : [raw];
    for (const v of vals) {
      q.append(key, v);
    }
  }
  const suffix = q.toString();
  redirect(suffix ? `/?${suffix}` : "/");
}

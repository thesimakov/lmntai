import { MarketingInfoShell } from "@/components/marketing/marketing-info-shell";

/**
 * Публичные страницы без дашборда: /pricing, /docs
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingInfoShell>{children}</MarketingInfoShell>;
}

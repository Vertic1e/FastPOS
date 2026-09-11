import { requireUser } from "@/lib/auth";
import { n } from "@/lib/format";
import { getOrCreateSettings } from "@/lib/seed";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  const s = await getOrCreateSettings();

  return (
    <SettingsClient
      initial={{
        storeName: s.storeName,
        address: s.address,
        phone: s.phone,
        taxRate: n(s.taxRate),
        currency: s.currency,
        secondaryCurrency: s.secondaryCurrency || "KHR",
        exchangeRate: n(s.exchangeRate) || 4000,
        enableDualCurrency: s.enableDualCurrency ?? true,
        fontSize: s.fontSize || "normal",
        receiptHeader: s.receiptHeader,
        receiptFooter: s.receiptFooter,
        accent: s.accent,
        posColumns: s.posColumns,
        categoryChips: s.categoryChips,
      }}
    />
  );
}

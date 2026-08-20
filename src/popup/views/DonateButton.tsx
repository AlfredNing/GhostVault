import { useState } from "react";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "../i18n";
import { DonateDialog } from "./DonateDialog";

/**
 * "Buy me an Americano" entry point. Mounted on every popup screen
 * (welcome / unlock / vault) so the donate entry is never out of reach.
 */
export function DonateButton({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        title={t("vault.donate")}
        aria-label={t("vault.donate")}
        onClick={() => setOpen(true)}
      >
        <Coffee />
      </Button>
      <DonateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

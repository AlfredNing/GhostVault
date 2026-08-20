import { Coffee } from "lucide-react";
import donateQr from "@/assets/donate-wechat.jpg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "../i18n";

export function DonateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="size-4 text-amber-400" />
            {t("donate.title")}
          </DialogTitle>
          <DialogDescription>{t("donate.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <img
            src={donateQr}
            alt={t("donate.title")}
            className="w-56 rounded-xl border border-white/10"
          />
          <p className="text-sm text-muted-foreground">{t("donate.caption")}</p>
          <p className="text-xs text-muted-foreground/80">{t("donate.hint")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

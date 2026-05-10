import { AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/utils/cn";

import { Button } from "./Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
    button: "danger" as const,
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
    button: "primary" as const,
  },
  info: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
    button: "primary" as const,
  },
} as const;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "warning",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const styles = variantStyles[variant];
  const Icon = variant === "info" ? Info : AlertTriangle;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      ariaLabel={typeof title === "string" ? title : undefined}
    >
      <ModalHeader onClose={onCancel}>{title}</ModalHeader>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div
            className={cn("mt-0.5 rounded-full p-2", styles.icon)}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </div>
            {description && (
              <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          {cancelLabel ?? t("common.cancel")}
        </Button>
        <Button variant={styles.button} onClick={onConfirm} loading={isLoading}>
          {confirmLabel ?? t("common.confirm")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

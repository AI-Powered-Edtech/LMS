import { ArrowLeft, Loader2, ShieldCheck, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

interface SchoolCreateFormProps {
  userRole: "teacher" | "admin";
  fullName: string;
  schoolName: string;
  isSubmitting: boolean;
  onFullNameChange: (value: string) => void;
  onSchoolNameChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (e: FormEvent) => void;
}

const ROLE_VISUAL = {
  teacher: {
    icon: Users,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    ring: "focus:ring-blue-500",
    btnBg: "bg-blue-600 hover:bg-blue-700",
  },
  admin: {
    icon: ShieldCheck,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    ring: "focus:ring-amber-500",
    btnBg: "bg-amber-600 hover:bg-amber-700",
  },
};

export function SchoolCreateForm({
  userRole,
  fullName,
  schoolName,
  isSubmitting,
  onFullNameChange,
  onSchoolNameChange,
  onBack,
  onSubmit,
}: SchoolCreateFormProps) {
  const { t } = useTranslation();
  const cfg = ROLE_VISUAL[userRole];
  const Icon = cfg.icon;
  const tx = (key: string) => t(`schoolCreateForm.roles.${userRole}.${key}`);

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`h-10 w-10 ${cfg.iconBg} ${cfg.iconColor} rounded-xl flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{tx("title")}</h2>
          <p className="text-slate-400 text-xs">{tx("description")}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("schoolCreateForm.labels.fullName")}
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 ${cfg.ring} outline-none`}
            placeholder={tx("placeholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("schoolCreateForm.labels.schoolName")}
          </label>
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => onSchoolNameChange(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 ${cfg.ring} outline-none`}
            placeholder={tx("schoolPlaceholder")}
          />
          <p className="text-xs text-slate-500 mt-2">{tx("schoolHint")}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t("schoolCreateForm.back")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 ${cfg.btnBg} text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              tx("submitLabel")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

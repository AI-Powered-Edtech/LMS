import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

interface StudentJoinFormProps {
  fullName: string;
  joinCode: string;
  isSubmitting: boolean;
  onFullNameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function StudentJoinForm({
  fullName,
  joinCode,
  isSubmitting,
  onFullNameChange,
  onJoinCodeChange,
  onBack,
  onSubmit,
}: StudentJoinFormProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
          <BookOpen size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {t("studentJoinForm.title")}
          </h2>
          <p className="text-slate-400 text-xs">
            {t("studentJoinForm.subtitle")}
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("studentJoinForm.labels.fullName")}
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder={t("studentJoinForm.placeholders.fullName")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("studentJoinForm.labels.joinCode")}
          </label>
          <input
            type="text"
            required
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg tracking-widest text-center uppercase"
            placeholder="ABC123"
            maxLength={10}
          />
          <p className="text-xs text-slate-500 mt-2">
            {t("studentJoinForm.hint")}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t("studentJoinForm.back")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              t("studentJoinForm.submit")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

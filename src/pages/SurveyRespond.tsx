// ==========================================================================
// SurveyRespond — Halaman pengisian survei untuk guru, siswa, dan orang tua
// Route: /app/student/survey/:surveyId
//        /app/teacher/survey/:surveyId
//        /app/parent/survey/:surveyId
// ==========================================================================

import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { SurveyResponseForm } from "@/features/principal/components/SurveyResponseForm";

export function SurveyRespondPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  if (!surveyId) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Survei tidak ditemukan.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Tombol kembali */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <SurveyResponseForm surveyId={surveyId} />
      </div>
    </div>
  );
}


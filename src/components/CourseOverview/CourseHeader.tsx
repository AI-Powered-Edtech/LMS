import { BookOpen, PlayCircle, User } from "lucide-react";
import { motion } from "motion/react";

interface CourseHeaderProps {
  course: { title: string; description: string | null };
  instructorName?: string;
  onContinueLearning: () => void;
  hasProgress: boolean;
}

export function CourseHeader({
  course,
  instructorName,
  onContinueLearning,
  hasProgress,
}: CourseHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-slate-200/70 shadow-md shadow-slate-200/40 p-6 md:p-8"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1
              title={course.title}
              className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight truncate"
            >
              {course.title}
            </h1>
          </div>

          {course.description && (
            <p className="text-slate-500 text-sm md:text-base leading-relaxed line-clamp-2 mb-3 ml-[52px]">
              {course.description}
            </p>
          )}

          {instructorName && (
            <div className="flex items-center gap-2 text-sm text-slate-400 ml-[52px]">
              <User className="w-4 h-4" />
              <span>
                Pengajar:{" "}
                <span className="text-slate-600 font-medium">
                  {instructorName}
                </span>
              </span>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinueLearning}
          className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow shrink-0"
        >
          <PlayCircle className="w-5 h-5" />
          {hasProgress ? "Lanjut Belajar" : "Mulai Belajar"}
        </motion.button>
      </div>
    </motion.div>
  );
}

import { Compass, Home } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFound() {
  usePageTitle("Tidak Ditemukan");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Icon */}
        <motion.div
          className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700"
          initial={{ rotate: -15, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <Compass className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </motion.div>

        {/* Large 404 */}
        <h1 className="text-8xl sm:text-9xl font-black text-slate-300 dark:text-slate-700 leading-none select-none">
          404
        </h1>

        {/* Title */}
        <h2 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
          Halaman tidak ditemukan
        </h2>

        {/* Subtext */}
        <p className="mt-3 text-slate-500 dark:text-slate-400 text-base leading-relaxed">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>

        {/* CTA */}
        <motion.button
          onClick={() => navigate("/app")}
          className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 active:scale-[0.98]"
          whileTap={{ scale: 0.97 }}
        >
          <Home className="w-4 h-4" />
          Kembali ke Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
}

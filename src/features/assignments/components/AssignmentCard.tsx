import { Award, Clock, FileText } from 'lucide-react'
import { motion } from 'motion/react'

import type { Assignment } from '@/features/assignments/api/assignmentService'

interface AssignmentCardProps {
  assignment: Assignment
  onSelect: (assignment: Assignment) => void
}

export function AssignmentCard({ assignment, onSelect }: AssignmentCardProps) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      onClick={() => onSelect(assignment)}
      className="group text-left bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col h-full"
    >
      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
        <FileText className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 transition-colors line-clamp-2 flex-1">
        {assignment.title}
      </h3>
      <div className="flex items-center gap-4 mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span className="flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          {assignment.max_points} Pts
        </span>
        {assignment.due_date && (
          <span className="flex items-center gap-1.5 text-rose-500">
            <Clock className="w-3.5 h-3.5" />
            {new Date(assignment.due_date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        )}
      </div>
    </motion.button>
  )
}

import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/utils/cn";

import type { RubricCriterion, RubricLevel } from "../types";

interface RubricCriterionRowProps {
  criterion: RubricCriterion;
  provided: DraggableProvided;
  onUpdate: (updates: Partial<RubricCriterion>) => void;
  onDelete: () => void;
  onAddLevel: () => void;
  onUpdateLevel: (levelId: string, updates: Partial<RubricLevel>) => void;
  onDeleteLevel: (levelId: string) => void;
}

const INPUT_CLS =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white dark:placeholder-slate-500 transition-colors";

export function RubricCriterionRow({
  criterion,
  provided,
  onUpdate,
  onDelete,
  onAddLevel,
  onUpdateLevel,
  onDeleteLevel,
}: RubricCriterionRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Criterion Header */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700/50">
        {/* Drag Handle */}
        <div
          {...provided.dragHandleProps}
          className="mt-1 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing rounded"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Criterion Fields */}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={criterion.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Judul kriteria..."
            className={INPUT_CLS}
          />
          <input
            type="text"
            value={criterion.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Deskripsi kriteria (opsional)..."
            className={INPUT_CLS}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Poin Maks:
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={criterion.max_points}
              onChange={(e) =>
                onUpdate({ max_points: parseInt(e.target.value, 10) || 0 })
              }
              className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white text-center font-bold"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            {isExpanded ? "▲" : "▼"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Levels Grid */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Tingkat Penilaian
          </div>
          <div className="space-y-2">
            {criterion.levels.map((level) => (
              <div
                key={level.id}
                className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={level.label}
                    onChange={(e) =>
                      onUpdateLevel(level.id, { label: e.target.value })
                    }
                    placeholder="Label (mis: Baik)"
                    className={cn(INPUT_CLS, "font-bold")}
                  />
                  <input
                    type="text"
                    value={level.description}
                    onChange={(e) =>
                      onUpdateLevel(level.id, { description: e.target.value })
                    }
                    placeholder="Deskripsi tingkat..."
                    className={cn(INPUT_CLS, "sm:col-span-1")}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Poin:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={criterion.max_points}
                      value={level.points}
                      onChange={(e) =>
                        onUpdateLevel(level.id, {
                          points: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white text-center font-bold"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteLevel(level.id)}
                  disabled={criterion.levels.length <= 1}
                  className="p-1.5 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onAddLevel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Tingkat
          </button>
        </div>
      )}
    </div>
  );
}

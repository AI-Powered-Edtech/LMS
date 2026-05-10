import { useMemo, useState } from "react";

import { useCourses } from "@/features/courses/queries/courseQueries";
import type { Course } from "@/features/courses/types";
import {
  Assignment,
  useGradebook,
} from "@/features/gradebook/hooks/useGradebookQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";

export function useGradebookState() {
  usePageTitle("Buku Nilai");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const { students, assignments, grades, updateGrade, addAssignment } =
    useGradebook(0, selectedCourseId || undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    assignmentId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    title: "",
    type: "assignment",
    maxScore: 100,
    date: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
  });

  // Course-based gradebook (real DB data)
  const coursesQuery = useCourses({ limit: 50 });
  const courses: Course[] = coursesQuery.data?.courses ?? [];

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignment.title && newAssignment.type && newAssignment.maxScore) {
      const id = `a${Date.now()}`;
      // FIXED: addAssignment is now async (persists to DB); fire-and-forget is intentional
      // — the cache is updated optimistically so UI remains responsive.
      // Pass selectedCourseId so addGradebookItem receives a real FK-valid course UUID.
      void addAssignment(
        {
          id,
          title: newAssignment.title,
          type: newAssignment.type as Assignment["type"],
          maxScore: Number(newAssignment.maxScore),
          date:
            newAssignment.date ||
            new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            }),
        },
        selectedCourseId || undefined,
      );
      setIsAddModalOpen(false);
      setNewAssignment({
        title: "",
        type: "assignment",
        maxScore: 100,
        date: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
      });
    }
  };

  const studentStatsMap = useMemo(() => {
    const map = new Map<string, { average: number; total: number }>();
    for (const student of students) {
      const studentGrades = grades[student.id];
      if (!studentGrades) {
        map.set(student.id, { average: 0, total: 0 });
        continue;
      }
      const scores = Object.values(studentGrades)
        .map((entry) => entry.score)
        .filter((score): score is number => score !== null);
      if (scores.length === 0) {
        map.set(student.id, { average: 0, total: 0 });
        continue;
      }
      const total = scores.reduce((a, b) => a + b, 0);
      map.set(student.id, {
        average: Math.round(total / scores.length),
        total,
      });
    }
    return map;
  }, [students, grades]);

  const {
    classAverage,
    highestScore,
    lowestScore,
    highestStudent,
    lowestStudent,
  } = useMemo(() => {
    const averages: { name: string; avg: number }[] = [];
    for (const student of students) {
      const avg = studentStatsMap.get(student.id)?.average ?? 0;
      if (avg > 0) averages.push({ name: student.name, avg });
    }
    if (averages.length === 0) {
      return {
        classAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        highestStudent: "-",
        lowestStudent: "-",
      };
    }
    // ⚡ Perf: Consolidate multiple chained array iterations into a single pass
    let sum = 0;
    let best = averages[0];
    let worst = averages[0];

    for (let i = 0; i < averages.length; i++) {
      const current = averages[i];
      sum += current.avg;
      if (current.avg > best.avg) best = current;
      if (current.avg < worst.avg) worst = current;
    }

    return {
      classAverage: Math.round(sum / averages.length),
      highestScore: best.avg,
      lowestScore: worst.avg,
      highestStudent: best.name,
      lowestStudent: worst.name,
    };
  }, [students, studentStatsMap]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.nis.includes(debouncedSearch),
      ),
    [students, debouncedSearch],
  );

  const handleCellClick = (
    studentId: string,
    assignmentId: string,
    currentScore: number | null,
  ) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentScore !== null ? currentScore.toString() : "");
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      const numValue = editValue === "" ? null : parseInt(editValue, 10);
      if (
        numValue === null ||
        (!isNaN(numValue) && numValue >= 0 && numValue <= 100)
      ) {
        updateGrade(editingCell.studentId, editingCell.assignmentId, numValue);
      }
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  return {
    // Data
    students,
    assignments,
    grades,
    filteredStudents,
    studentStatsMap,
    courses,
    selectedCourseId,

    // Stats
    classAverage,
    highestScore,
    lowestScore,
    highestStudent,
    lowestStudent,

    // Edit state
    editingCell,
    editValue,
    searchQuery,

    // Modal
    isAddModalOpen,
    newAssignment,

    // Actions
    setSelectedCourseId,
    setSearchQuery,
    setEditingCell,
    setEditValue,
    setIsAddModalOpen,
    setNewAssignment,
    handleAddAssignment,
    handleCellClick,
    handleSaveEdit,
    handleKeyDown,
  };
}

export function getGradeColor(score: number | null) {
  if (score === null || score === 0)
    return "text-slate-400 dark:text-slate-500";
  if (score >= 85) return "text-green-600 dark:text-green-400 font-bold";
  if (score >= 70) return "text-blue-600 dark:text-blue-400 font-bold";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400 font-bold";
  return "text-red-600 dark:text-red-400 font-bold";
}

export function getGradeBg(score: number | null) {
  if (score === null || score === 0) return "bg-slate-50 dark:bg-slate-800/50";
  if (score >= 85) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 70) return "bg-blue-50 dark:bg-blue-900/20";
  if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

export function getTypeLabel(type: string) {
  switch (type) {
    case "quiz":
      return "Auto-grade";
    case "assignment":
      return "Tugas";
    case "project":
      return "Proyek";
    case "exam":
      return "Ujian";
    case "presentation":
      return "Presentasi";
    case "offline":
      return "Offline";
    default:
      return type;
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case "quiz":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "exam":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "project":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "presentation":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "offline":
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

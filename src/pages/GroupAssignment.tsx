import { useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { StudentGroupView } from "@/features/assignments/components/groups/StudentGroupView";
import { TeacherGroupView } from "@/features/assignments/components/groups/TeacherGroupView";
import { usePageTitle } from "@/hooks/usePageTitle";

export function GroupAssignment() {
  usePageTitle("Tugas Kelompok");
  const { role } = useAuth();
  const { assignmentId = "" } = useParams<{ assignmentId: string }>();

  if (role === "teacher") {
    return <TeacherGroupView assignmentId={assignmentId} />;
  }

  return <StudentGroupView assignmentId={assignmentId} />;
}

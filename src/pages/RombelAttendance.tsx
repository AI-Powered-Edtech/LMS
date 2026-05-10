import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AttendanceStatus,
  rombelAttendanceService,
} from "@/features/attendance/api/rombelAttendanceService";
import {
  useRombelList,
  useRombelMembers,
} from "@/features/rombel/hooks/useRombel";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { db } from "@/services/db";

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string;
}

const STATUS_BUTTONS: Array<{
  key: AttendanceStatus;
  label: string;
  cls: string;
}> = [
  {
    key: "hadir",
    label: "H",
    cls: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
  {
    key: "sakit",
    label: "S",
    cls: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  {
    key: "izin",
    label: "I",
    cls: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  { key: "alpa", label: "A", cls: "bg-red-100 text-red-800 hover:bg-red-200" },
];

export function RombelAttendance() {
  usePageTitle("Absen Rombel");
  const { tenantId, user } = useAuth();
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data: rombels = [] } = useRombelList();
  const [rombelId, setRombelId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const { data: members = [] } = useRombelMembers(rombelId || null);

  const { data: students = [] } = useQuery({
    queryKey: [
      "rombel_attendance_students",
      rombelId,
      members.map((m) => m.student_id).join(","),
    ],
    queryFn: async () => {
      if (members.length === 0) return [] as ProfileLite[];
      const ids = members.map((m) => m.student_id);
      const { data, error } = await db
        .from<Array<ProfileLite>>("profiles")
        .select("id, full_name, email")
        .in("id", ids)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
    enabled: members.length > 0,
  });

  const { data: existing } = useQuery({
    queryKey: ["rombel_attendance_day", rombelId, date],
    queryFn: () =>
      rombelId && date
        ? rombelAttendanceService.getForDay(rombelId, date)
        : Promise.resolve([]),
    enabled: !!rombelId && !!date,
  });

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  useEffect(() => {
    if (!existing) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const e of existing) next[e.student_id] = e.status;
    setMarks(next);
  }, [existing]);

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
    };
    for (const status of Object.values(marks)) counts[status]++;
    return counts;
  }, [marks]);

  function setMark(studentId: string, status: AttendanceStatus) {
    setMarks((s) => ({ ...s, [studentId]: status }));
  }

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    for (const stu of students) next[stu.id] = status;
    setMarks(next);
  }

  async function handleSave() {
    if (!tenantId || !user) return;
    const records = Object.entries(marks).map(([student_id, status]) => ({
      student_id,
      status,
    }));
    if (records.length === 0) {
      addToast({ type: "info", message: "Belum ada tanda absen" });
      return;
    }
    try {
      const count = await rombelAttendanceService.bulkRecord({
        tenantId,
        rombelId,
        attendanceDate: date,
        recorderId: user.id,
        records,
      });
      addToast({ type: "success", message: `${count} absen tersimpan` });
      void qc.invalidateQueries({
        queryKey: ["rombel_attendance_day", rombelId, date],
      });
    } catch (err) {
      addToast({
        type: "error",
        message: "Gagal menyimpan absen",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-500" />
            Absen Rombel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catat kehadiran harian per rombel. H = Hadir, S = Sakit, I = Izin, A
            = Alpa.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={!rombelId || students.length === 0}
        >
          Simpan
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <select
            value={rombelId}
            onChange={(e) => setRombelId(e.target.value)}
            className="w-60"
          >
            <option value="">— pilih rombel —</option>
            {rombels.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
            aria-label="Tanggal absen"
          />
          {rombelId && students.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-slate-500">Tandai semua:</span>
              {STATUS_BUTTONS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => markAll(b.key)}
                  className={`text-xs font-bold px-2 py-1 rounded ${b.cls}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!rombelId ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Pilih rombel untuk memulai pencatatan absen.
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada anggota rombel ini.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center text-sm">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-xs text-slate-500">Hadir</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {summary.hadir}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-xs text-slate-500">Sakit</p>
                <p className="text-2xl font-bold text-amber-700">
                  {summary.sakit}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs text-slate-500">Izin</p>
                <p className="text-2xl font-bold text-blue-700">
                  {summary.izin}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xs text-slate-500">Alpa</p>
                <p className="text-2xl font-bold text-red-700">
                  {summary.alpa}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((stu) => (
                <li
                  key={stu.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {stu.full_name ?? stu.email}
                    </p>
                    <p className="text-xs text-slate-500">{stu.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {STATUS_BUTTONS.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setMark(stu.id, b.key)}
                        aria-label={`${b.label} untuk ${stu.full_name ?? stu.email}`}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          marks[stu.id] === b.key
                            ? `${b.cls} ring-2 ring-offset-2 ring-current`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

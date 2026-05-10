import { describe, expect, it } from "vitest";

import {
  translateAssignmentStatus,
  translateContentType,
  translateCourseStatus,
  translateDbError,
  translateEventType,
  translateInvitationStatus,
  translateLessonType,
  translateQuizAttemptStatus,
  translateQuizStatus,
} from "../statusTranslations";

describe("statusTranslations", () => {
  describe("translateCourseStatus", () => {
    it("should translate known statuses", () => {
      expect(translateCourseStatus("draft")).toBe("Draf");
      expect(translateCourseStatus("published")).toBe("Diterbitkan");
      expect(translateCourseStatus("archived")).toBe("Diarsipkan");
      expect(translateCourseStatus("in_review")).toBe("Dalam Peninjauan");
      expect(translateCourseStatus("approved")).toBe("Disetujui");
    });

    it("should be case insensitive", () => {
      expect(translateCourseStatus("DRAFT")).toBe("Draf");
      expect(translateCourseStatus("PuBliShed")).toBe("Diterbitkan");
    });

    it("should return the original status if unknown", () => {
      expect(translateCourseStatus("unknown")).toBe("unknown");
      expect(translateCourseStatus("")).toBe("");
    });
  });

  describe("translateAssignmentStatus", () => {
    it("should translate known statuses", () => {
      expect(translateAssignmentStatus("pending")).toBe("Menunggu");
      expect(translateAssignmentStatus("submitted")).toBe("Dikumpulkan");
      expect(translateAssignmentStatus("graded")).toBe("Dinilai");
      expect(translateAssignmentStatus("late")).toBe("Terlambat");
      expect(translateAssignmentStatus("missing")).toBe("Belum Dikumpulkan");
      expect(translateAssignmentStatus("active")).toBe("Aktif");
      expect(translateAssignmentStatus("inactive")).toBe("Tidak Aktif");
      expect(translateAssignmentStatus("assigned")).toBe("Ditugaskan");
      expect(translateAssignmentStatus("turned_in")).toBe("Dikumpulkan");
      expect(translateAssignmentStatus("returned")).toBe("Dikembalikan");
    });

    it("should be case insensitive", () => {
      expect(translateAssignmentStatus("PENDING")).toBe("Menunggu");
      expect(translateAssignmentStatus("SuBmItted")).toBe("Dikumpulkan");
    });

    it("should return the original status if unknown", () => {
      expect(translateAssignmentStatus("unknown")).toBe("unknown");
      expect(translateAssignmentStatus("")).toBe("");
    });
  });

  describe("translateQuizStatus", () => {
    it("should translate known statuses", () => {
      expect(translateQuizStatus("draft")).toBe("Draf");
      expect(translateQuizStatus("published")).toBe("Diterbitkan");
      expect(translateQuizStatus("submitted")).toBe("Dikumpulkan");
      expect(translateQuizStatus("graded")).toBe("Dinilai");
      expect(translateQuizStatus("in_progress")).toBe("Sedang Dikerjakan");
    });

    it("should be case insensitive", () => {
      expect(translateQuizStatus("DRAFT")).toBe("Draf");
      expect(translateQuizStatus("GraDeD")).toBe("Dinilai");
    });

    it("should return the original status if unknown", () => {
      expect(translateQuizStatus("unknown")).toBe("unknown");
      expect(translateQuizStatus("")).toBe("");
    });
  });

  describe("translateInvitationStatus", () => {
    it("should translate known statuses", () => {
      expect(translateInvitationStatus("pending")).toBe("Menunggu");
      expect(translateInvitationStatus("accepted")).toBe("Diterima");
      expect(translateInvitationStatus("expired")).toBe("Kadaluarsa");
      expect(translateInvitationStatus("revoked")).toBe("Dicabut");
    });

    it("should be case insensitive", () => {
      expect(translateInvitationStatus("PENDING")).toBe("Menunggu");
      expect(translateInvitationStatus("ExPirEd")).toBe("Kadaluarsa");
    });

    it("should return the original status if unknown", () => {
      expect(translateInvitationStatus("unknown")).toBe("unknown");
      expect(translateInvitationStatus("")).toBe("");
    });
  });

  describe("translateQuizAttemptStatus", () => {
    it("should translate known statuses", () => {
      expect(translateQuizAttemptStatus("completed")).toBe("Selesai");
      expect(translateQuizAttemptStatus("in_progress")).toBe("Berlangsung");
      expect(translateQuizAttemptStatus("submitted")).toBe("Dikumpulkan");
      expect(translateQuizAttemptStatus("graded")).toBe("Dinilai");
      expect(translateQuizAttemptStatus("timed_out")).toBe("Waktu Habis");
    });

    it("should be case insensitive", () => {
      expect(translateQuizAttemptStatus("COMPLETED")).toBe("Selesai");
      expect(translateQuizAttemptStatus("SubMitted")).toBe("Dikumpulkan");
    });

    it("should return the original status if unknown", () => {
      expect(translateQuizAttemptStatus("unknown")).toBe("unknown");
      expect(translateQuizAttemptStatus("")).toBe("");
    });
  });

  describe("translateLessonType", () => {
    it("should translate known lesson types", () => {
      expect(translateLessonType("article")).toBe("Artikel");
      expect(translateLessonType("video")).toBe("Video");
      expect(translateLessonType("quiz")).toBe("Kuis");
      expect(translateLessonType("scorm")).toBe("SCORM");
      expect(translateLessonType("assignment")).toBe("Tugas");
    });

    it("should be case insensitive", () => {
      expect(translateLessonType("ARTICLE")).toBe("Artikel");
      expect(translateLessonType("ViDeo")).toBe("Video");
    });

    it("should return the original type if unknown", () => {
      expect(translateLessonType("unknown")).toBe("unknown");
      expect(translateLessonType("")).toBe("");
    });
  });

  describe("translateContentType", () => {
    it("should translate known content types", () => {
      expect(translateContentType("post")).toBe("Postingan");
      expect(translateContentType("comment")).toBe("Komentar");
      expect(translateContentType("assignment")).toBe("Tugas");
      expect(translateContentType("user")).toBe("Pengguna");
    });

    it("should be case insensitive", () => {
      expect(translateContentType("POST")).toBe("Postingan");
      expect(translateContentType("CoMmEnt")).toBe("Komentar");
    });

    it("should return the original type if unknown", () => {
      expect(translateContentType("unknown")).toBe("unknown");
      expect(translateContentType("")).toBe("");
    });
  });

  describe("translateEventType", () => {
    it("should translate known event types", () => {
      expect(translateEventType("class")).toBe("Kelas");
      expect(translateEventType("exam")).toBe("Ujian");
      expect(translateEventType("assignment")).toBe("Tugas");
      expect(translateEventType("meeting")).toBe("Rapat");
      expect(translateEventType("holiday")).toBe("Libur");
      expect(translateEventType("event")).toBe("Acara");
      expect(translateEventType("deadline")).toBe("Tenggat");
      expect(translateEventType("quiz")).toBe("Kuis");
      expect(translateEventType("lesson")).toBe("Pelajaran");
    });

    it("should be case insensitive", () => {
      expect(translateEventType("CLASS")).toBe("Kelas");
      expect(translateEventType("ExaM")).toBe("Ujian");
    });

    it("should return the original type if unknown", () => {
      expect(translateEventType("unknown")).toBe("unknown");
      expect(translateEventType("")).toBe("");
    });
  });

  describe("translateDbError", () => {
    it("should translate app_role error", () => {
      expect(translateDbError("invalid app_role")).toBe(
        "Terjadi kesalahan konfigurasi. Hubungi administrator.",
      );
      expect(translateDbError("invalid input value for enum")).toBe(
        "Terjadi kesalahan konfigurasi. Hubungi administrator.",
      );
    });

    it("should translate Unauthorized error", () => {
      expect(translateDbError("Unauthorized access")).toBe(
        "Anda tidak memiliki akses untuk tindakan ini.",
      );
      expect(translateDbError("Error P0002")).toBe(
        "Anda tidak memiliki akses untuk tindakan ini.",
      );
    });

    it("should translate not found error", () => {
      expect(translateDbError("record not found")).toBe(
        "Data tidak ditemukan.",
      );
      expect(translateDbError("Error P0001")).toBe("Data tidak ditemukan.");
    });

    it("should translate duplicate error", () => {
      expect(translateDbError("duplicate key value")).toBe(
        "Data sudah ada. Tidak bisa membuat duplikat.",
      );
      expect(translateDbError("Error 23505")).toBe(
        "Data sudah ada. Tidak bisa membuat duplikat.",
      );
    });

    it("should translate network error", () => {
      expect(translateDbError("network timeout")).toBe(
        "Gagal terhubung ke server. Periksa koneksi internet Anda.",
      );
      expect(translateDbError("fetch failed")).toBe(
        "Gagal terhubung ke server. Periksa koneksi internet Anda.",
      );
    });

    it("should return a generic error message for unknown errors", () => {
      expect(translateDbError("unknown error")).toBe(
        "Terjadi kesalahan. Silakan coba lagi.",
      );
    });

    it("should return a generic error message for empty strings", () => {
      expect(translateDbError("")).toBe(
        "Terjadi kesalahan. Silakan coba lagi.",
      );
    });

    it("should handle undefined or null gracefully by fallback to generic message if typed poorly", () => {
      // @ts-expect-error testing invalid input
      expect(translateDbError(undefined)).toBe(
        "Terjadi kesalahan. Silakan coba lagi.",
      );
      // @ts-expect-error testing invalid input
      expect(translateDbError(null)).toBe(
        "Terjadi kesalahan. Silakan coba lagi.",
      );
    });
  });
});

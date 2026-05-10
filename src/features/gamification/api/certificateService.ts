import { readVilSession } from "@/services/auth/vilSession";

interface CertificatePdfParams {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  tenantName: string;
  certificateNumber: string;
}

/**
 * Certificate Service
 * Wraps the VIL /api/v1/pdf/certificate endpoint for certificate PDF generation.
 */
export const certificateService = {
  /**
   * Generate a certificate PDF via the VIL API.
   * Returns a Blob containing the PDF data.
   */
  async generatePdf(params: CertificatePdfParams): Promise<Blob> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const token = readVilSession()?.access_token;

      const url = apiUrl
        ? `${apiUrl}/api/v1/pdf/certificate`
        : new URL("/api/v1/pdf/certificate", window.location.origin).toString();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: "certificate",
          data: params,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.",
          );
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return response.blob();
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      if (
        error.message?.includes("not found") ||
        error.code === "PGRST202" ||
        error.message?.includes("404")
      ) {
        throw new Error(
          "Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.",
        );
      }
      throw err;
    }
  },
};

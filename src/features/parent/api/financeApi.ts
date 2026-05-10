/**
 * Parent finance API — Workstream C3.
 *
 * Surfaces SPP invoices for the parent's children and drives Midtrans Snap
 * checkout. RLS at the DB layer enforces that a parent can only see their
 * own children's invoices; we don't double-filter on the client.
 */

import { getVilHttpBaseUrl } from "@/services/api/baseUrl";
import { readVilSession } from "@/services/auth/vilSession";
import { db } from "@/services/db";
import { logger } from "@/utils/logger";

export type InvoiceStatus =
  | "pending"
  | "unpaid"
  | "paid"
  | "cancelled"
  | "failed";

export interface ParentInvoice {
  id: string;
  invoice_number: string;
  student_id: string;
  student_name: string;
  amount_due: number;
  amount_paid: number;
  due_date: string | null;
  status: InvoiceStatus;
  midtrans_order_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface SnapSession {
  snap_token: string;
  redirect_url: string;
  order_id: string;
}

export async function listParentInvoices(): Promise<ParentInvoice[]> {
  const { data, error } = await db.rpc("get_parent_invoices");
  if (error) {
    logger.error("[Parent Finance] get_parent_invoices error:", error);
    throw new Error("Gagal memuat tagihan SPP.");
  }
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    invoice_number: (row.invoice_number as string) ?? "",
    student_id: row.student_id as string,
    student_name: (row.student_name as string) ?? "",
    amount_due: Number(row.amount_due ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    due_date: (row.due_date as string | null) ?? null,
    status: ((row.status as string) ?? "pending") as InvoiceStatus,
    midtrans_order_id: (row.midtrans_order_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: (row.created_at as string) ?? "",
  }));
}

/**
 * Create or refresh a Midtrans Snap session for an invoice. Backed by the
 * Rust handler `POST /api/v1/payments/snap` (Workstream C1).
 */
export async function createSnapSession(
  invoiceId: string,
): Promise<SnapSession> {
  const apiUrl = getVilHttpBaseUrl();
  const token = readVilSession()?.access_token;
  const res = await fetch(`${apiUrl}/api/v1/payments/snap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { detail?: string }).detail ?? `HTTP ${res.status}`;
    throw new Error(`Gagal memulai pembayaran: ${msg}`);
  }
  const body = (await res.json()) as { data?: SnapSession } & SnapSession;
  // VIL responses sometimes wrap in { data, ... }
  return body.data ?? body;
}

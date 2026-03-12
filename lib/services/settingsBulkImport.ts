/**
 * Shared utilities for settings bulk import/export.
 * Each settings page uses these to download a template and upload a filled file.
 */

import { getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/env";

export interface BulkImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
}

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Download bulk import template for a settings entity.
 * @param apiBase - e.g. "/api/Payers"
 * @param fileName - e.g. "Payers_Import_Template.xlsx"
 */
export async function downloadImportTemplate(apiBase: string, fileName: string): Promise<void> {
  const url = getApiUrl(`${apiBase}/templates/import`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to download template.");
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Upload a filled template file for bulk import.
 * @param apiBase - e.g. "/api/Payers"
 * @param file - the Excel file
 */
export async function uploadBulkImport(apiBase: string, file: File): Promise<BulkImportResult> {
  const url = getApiUrl(`${apiBase}/import`);
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Import failed.";
    try {
      const j = JSON.parse(text) as { detail?: string; message?: string; title?: string };
      msg = j.detail ?? j.message ?? j.title ?? (text || msg);
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }
  const json = await res.json();
  // API wraps in { data: ..., success: true } envelope
  const payload = (json.data ?? json) as BulkImportResult;
  if (!payload.success && payload.errors?.length > 0) {
    throw new Error(payload.errors.join("; "));
  }
  return payload;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/contexts/ToastContext";
import { downloadImportTemplate, uploadBulkImport } from "@/lib/services/settingsBulkImport";

interface BulkImportActionsProps {
  /** API base path, e.g. "/api/Payers" */
  apiBase: string;
  /** File name for the downloaded template, e.g. "Payers_Import_Template.xlsx" */
  templateFileName: string;
  /** Called after a successful import so the page can reload its data */
  onImportSuccess: () => void | Promise<void>;
  /** Optional callback to control overlay loading state */
  onLoadingChange?: (loading: boolean) => void;
}

export function BulkImportActions({ apiBase, templateFileName, onImportSuccess, onLoadingChange }: BulkImportActionsProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDownload = useCallback(async () => {
    setOpen(false);
    setDownloading(true);
    try {
      await downloadImportTemplate(apiBase, templateFileName);
      toast.success("Template Downloaded", "The template has been downloaded successfully.");
    } catch (err) {
      toast.error("Download Failed", err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [apiBase, templateFileName, toast]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    onLoadingChange?.(true);
    try {
      const result = await uploadBulkImport(apiBase, file);
      toast.success("Import Successful", `${result.rowsImported} records have been imported successfully.`);
      await onImportSuccess();
    } catch (err) {
      toast.error("Import Failed", err instanceof Error ? err.message : "Import failed.");
    } finally {
      setUploading(false);
      onLoadingChange?.(false);
    }
  }, [apiBase, toast, onImportSuccess]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={() => setOpen((v) => !v)}
        disabled={downloading || uploading}
        className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
      >
        {downloading ? "Downloading..." : uploading ? "Importing..." : "Template"}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[180px] rounded-[6px] border border-[#E2E8F0] bg-white shadow-md whitespace-nowrap">
          <button
            onClick={handleDownload}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-[14px] font-aileron text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
          >
            <FileText className="h-4 w-4 text-[#64748B]" />
            Download Template
          </button>
          <button
            onClick={() => { setOpen(false); fileInputRef.current?.click(); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-[14px] font-aileron text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
          >
            <FileText className="h-4 w-4 text-[#64748B]" />
            Upload Template
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  );
}

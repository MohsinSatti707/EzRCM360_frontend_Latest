"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/contexts/ToastContext";
import { downloadImportTemplate, uploadBulkImport } from "@/lib/services/settingsBulkImport";

interface BulkImportActionsProps {
  /** API base path, e.g. "/api/Payers" */
  apiBase: string;
  /** File name for the downloaded template, e.g. "Payers_Import_Template.xlsx" */
  templateFileName: string;
  /** Called after a successful import so the page can reload its data */
  onImportSuccess: () => void;
}

export function BulkImportActions({ apiBase, templateFileName, onImportSuccess }: BulkImportActionsProps) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadImportTemplate(apiBase, templateFileName);
      toast.success("Template downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [apiBase, templateFileName, toast]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";
    setUploading(true);
    try {
      const result = await uploadBulkImport(apiBase, file);
      toast.success(`${result.rowsImported} records imported successfully.`);
      onImportSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setUploading(false);
    }
  }, [apiBase, toast, onImportSuccess]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
        className="h-10 rounded-[5px] px-[14px] font-aileron text-[14px] border-[#E2E8F0]"
      >
        <Download className="mr-1.5 h-4 w-4" />
        {downloading ? "Downloading..." : "Download Template"}
      </Button>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="h-10 rounded-[5px] px-[14px] font-aileron text-[14px] border-[#E2E8F0]"
      >
        <Upload className="mr-1.5 h-4 w-4" />
        {uploading ? "Importing..." : "Bulk Import"}
      </Button>
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

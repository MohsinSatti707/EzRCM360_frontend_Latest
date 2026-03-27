"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { DrawerForm } from "@/components/ui/DrawerForm";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ENUMS } from "@/lib/utils";
import type { CreatePlanRequest } from "@/lib/services/plans";
import type { PayerLookupDto } from "@/lib/services/lookups";

const CATEGORY = ENUMS.PlanCategory;
const TYPE = ENUMS.PlanType;

const CATEGORY_TO_TYPES: Record<number, number[]> = {
  [CATEGORY.Commercial]: [TYPE.Hmo, TYPE.Ppo, TYPE.Epo, TYPE.Pos, TYPE.Na],
  [CATEGORY.Medicare]: [TYPE.PartA, TYPE.PartB, TYPE.PartC, TYPE.PartD],
  [CATEGORY.RailroadMedicare]: [TYPE.PartA, TYPE.PartB, TYPE.PartC, TYPE.PartD],
  [CATEGORY.Tricare]: [TYPE.CHAMPUS, TYPE.CHAMPVA],
  [CATEGORY.Medicaid]: [TYPE.Na],
  [CATEGORY.MVA]: [TYPE.Na],
  [CATEGORY.WC]: [TYPE.Na],
  [CATEGORY.HmoManaged]: [TYPE.Hmo, TYPE.Na],
};

const inputCls =
  "w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";
const labelCls = "mb-1 block text-sm font-medium text-foreground";

/* ── Searchable Payer Dropdown ── */
function PayerDropdown({
  value,
  onChange,
  payers,
  onCreatePayer,
}: {
  value: string;
  onChange: (id: string) => void;
  payers: PayerLookupDto[];
  onCreatePayer?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () =>
      payers.filter((p) =>
        p.payerName.toLowerCase().includes(search.toLowerCase())
      ),
    [payers, search]
  );

  const selected = payers.find((p) => p.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.payerName ?? "Select payer"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-[5px] border border-[#E2E8F0] bg-white shadow-lg">
          <div className="relative border-b border-[#E2E8F0] px-3 py-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search Payer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 text-sm outline-none placeholder:text-[#94A3B8]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#F7F8F9] ${
                  p.id === value ? "bg-[#F0F7FF] font-medium text-[#0066CC]" : "text-foreground"
                }`}
              >
                {p.payerName}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">No payers found</div>
            )}
          </div>
          {onCreatePayer && (
            <button
              type="button"
              onClick={() => { setOpen(false); onCreatePayer(); }}
              className="w-full border-t border-[#E2E8F0] px-4 py-2.5 text-left text-sm font-medium text-[#0066CC] hover:bg-[#F0F7FF]"
            >
              + Create Payer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreatePlanRequest;
  onFormChange: (form: CreatePlanRequest) => void;
  payers: PayerLookupDto[];
  planCategories: { value: string; label: string }[];
  planTypes: { value: string; label: string }[];
  marketTypes: { value: string; label: string }[];
  nsaCategories: { value: string; label: string }[];
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  onCreatePayer?: () => void;
}

export function PlanFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  payers,
  planCategories,
  planTypes,
  marketTypes,
  nsaCategories,
  onSubmit,
  loading,
  error,
  onCreatePayer,
}: PlanFormModalProps) {
  const filteredPlanTypes = useMemo(() => {
    const allowed = CATEGORY_TO_TYPES[form.planCategory];
    if (!allowed) return planTypes;
    return planTypes.filter((t) => allowed.includes(Number(t.value)));
  }, [form.planCategory, planTypes]);

  const set = (patch: Partial<CreatePlanRequest>) =>
    onFormChange({ ...form, ...patch });

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Edit Plan" : "Add Plan"}
      footer={
        <div className="flex flex-1 justify-start gap-3">
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={loading}
            className="h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            {loading ? "Saving…" : (
              <>
                {editId ? "Update" : "Add Plan"} <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-10 px-[18px] py-3 rounded-[5px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33]"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <div className="space-y-6">
          {/* ── Top fields ── */}
          <div className="space-y-4">
            <Input
              label="Plan Name"
              required
              value={form.planName}
              placeholder="e.g., BCBS PPO Gold"
              onChange={(e) => set({ planName: e.target.value })}
            />
            <Input
              label="Plan Aliases"
              value={form.aliases ?? ""}
              placeholder="e.g., BCBS, BlueCross"
              onChange={(e) => set({ aliases: e.target.value })}
            />
            <Input
              label="Plan ID / Prefix"
              value={form.planIdPrefix ?? ""}
              placeholder="e.g., RCM-12345"
              onChange={(e) => set({ planIdPrefix: e.target.value })}
            />
            <div>
              <label className={labelCls}>Linked Payer</label>
              <PayerDropdown
                value={form.payerId}
                onChange={(id) => set({ payerId: id })}
                payers={payers}
                onCreatePayer={onCreatePayer}
              />
            </div>
          </div>

          {/* ── Classification ── */}
          <div className="space-y-4">
            <h3 className="font-aileron text-base font-bold text-[#2A2C33]">Classification</h3>
            <div>
              <label className={labelCls}>Plan Category</label>
              <select
                value={form.planCategory}
                onChange={(e) => {
                  const cat = Number(e.target.value);
                  const allowed = CATEGORY_TO_TYPES[cat];
                  set({ planCategory: cat, planType: allowed?.[0] ?? 0 });
                }}
                className={inputCls}
              >
                {planCategories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Plan Type</label>
              <select
                value={form.planType}
                onChange={(e) => set({ planType: Number(e.target.value) })}
                className={inputCls}
              >
                {filteredPlanTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Commercial Intelligence ── */}
          <div className="space-y-4">
            <h3 className="font-aileron text-base font-bold text-[#2A2C33]">Commercial Intelligence</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Market Type</label>
                <select
                  value={form.marketType ?? ""}
                  onChange={(e) => set({ marketType: e.target.value ? Number(e.target.value) : null })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {marketTypes.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Out-of-Network Benefits</label>
                <select
                  value={form.oonBenefits ? "yes" : "no"}
                  onChange={(e) => set({ oonBenefits: e.target.value === "yes" })}
                  className={inputCls}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Plan Resp. (%)</label>
                <input
                  type="number"
                  step="any"
                  value={form.planResponsibilityPct ?? ""}
                  onChange={(e) => set({ planResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Patient Resp. (%)</label>
                <input
                  type="number"
                  step="any"
                  value={form.patientResponsibilityPct ?? ""}
                  onChange={(e) => set({ patientResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Deductible ($)</label>
                <input
                  type="number"
                  step="any"
                  value={form.typicalDeductible ?? ""}
                  onChange={(e) => set({ typicalDeductible: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>OOP Max ($)</label>
                <input
                  type="number"
                  step="any"
                  value={form.oopMax ?? ""}
                  onChange={(e) => set({ oopMax: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.nsaEligible}
                onChange={(e) => set({ nsaEligible: e.target.checked })}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">NSA Eligible</span>
            </label>
            {form.nsaEligible && (
              <div>
                <label className={labelCls}>NSA Category</label>
                <select
                  value={form.nsaCategory ?? ""}
                  onChange={(e) => set({ nsaCategory: e.target.value ? Number(e.target.value) : null })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {nsaCategories.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Participation & Filing ── */}
          <div className="space-y-4">
            <h3 className="font-aileron text-base font-bold text-[#2A2C33]">Participation & Filing</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.providerParticipationApplicable}
                onChange={(e) => set({ providerParticipationApplicable: e.target.checked })}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">Provider Participation Applicable</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Initial Submission (Days)</label>
                <input
                  type="number"
                  value={form.timelyFilingInitialDays}
                  onChange={(e) => set({ timelyFilingInitialDays: Number(e.target.value) || 0 })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Corrected/Resubmission (Days)</label>
                <input
                  type="number"
                  value={form.timelyFilingResubmissionDays ?? ""}
                  onChange={(e) => set({ timelyFilingResubmissionDays: e.target.value === "" ? null : Number(e.target.value) })}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Appeal (Days)</label>
              <input
                type="number"
                value={form.timelyFilingAppealDays}
                onChange={(e) => set({ timelyFilingAppealDays: Number(e.target.value) || 0 })}
                className={inputCls}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </form>
    </DrawerForm>
  );
}

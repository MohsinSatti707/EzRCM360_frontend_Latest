"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DrawerForm } from "@/components/ui/DrawerForm";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { plansApi } from "@/lib/services/plans";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import { ENUMS } from "@/lib/utils";
import type { CreatePlanRequest } from "@/lib/services/plans";

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

interface AddPlanModalProps {
  open: boolean;
  onClose: () => void;
  payerId: string;
  payerName: string;
  onSuccess: () => void;
}

export function AddPlanModal({ open, onClose, payerId, payerName, onSuccess }: AddPlanModalProps) {
  const [planCategories, setPlanCategories] = useState<{ value: string; label: string }[]>([]);
  const [planTypes, setPlanTypes] = useState<{ value: string; label: string }[]>([]);
  const [marketTypes, setMarketTypes] = useState<{ value: string; label: string }[]>([]);
  const [nsaCategories, setNsaCategories] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState<CreatePlanRequest>(makeDefault(payerId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = plansApi();
  const toast = useToast();

  useEffect(() => {
    lookupsApi().getPlanCategories().then(setPlanCategories).catch(() => {});
    lookupsApi().getPlanTypes().then(setPlanTypes).catch(() => {});
    lookupsApi().getMarketTypes().then(setMarketTypes).catch(() => {});
    lookupsApi().getNsaCategories().then(setNsaCategories).catch(() => {});
  }, []);

  // Reset form when modal opens with a new payer
  useEffect(() => {
    if (open) {
      setForm(makeDefault(payerId));
      setError(null);
    }
  }, [open, payerId]);

  const filteredPlanTypes = useMemo(() => {
    const allowed = CATEGORY_TO_TYPES[form.planCategory];
    if (!allowed) return planTypes;
    return planTypes.filter((t) => allowed.includes(Number(t.value)));
  }, [form.planCategory, planTypes]);

  const set = (patch: Partial<CreatePlanRequest>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.planName.trim()) {
      setError("Plan name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.create(form);
      toast.success("Plan Created", "A new plan has been created and linked successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create plan.";
      setError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Add Plan"
      footer={
        <div className="flex flex-1 justify-start gap-3">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            {loading ? "Saving…" : (
              <>
                Add Plan <ArrowRight className="ml-1 h-4 w-4" />
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
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
              <input
                type="text"
                value={payerName}
                disabled
                className={`${inputCls} bg-muted cursor-not-allowed`}
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
            <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
              <ul className="list-inside space-y-1">
                <li>&bull; Yes (IN / OON validation required)</li>
                <li>&bull; No (participation irrelevant for this plan category)</li>
              </ul>
            </div>
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

function makeDefault(payerId: string): CreatePlanRequest {
  return {
    payerId,
    planName: "",
    aliases: "",
    planIdPrefix: "",
    planCategory: 0,
    planType: 0,
    marketType: null,
    oonBenefits: false,
    planResponsibilityPct: null,
    patientResponsibilityPct: null,
    typicalDeductible: null,
    oopMax: null,
    nsaEligible: false,
    nsaCategory: null,
    providerParticipationApplicable: false,
    timelyFilingInitialDays: 0,
    timelyFilingResubmissionDays: null,
    timelyFilingAppealDays: 0,
    status: 1,
  };
}

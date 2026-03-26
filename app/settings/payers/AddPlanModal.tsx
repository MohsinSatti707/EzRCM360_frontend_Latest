"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { plansApi } from "@/lib/services/plans";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import { ENUMS } from "@/lib/utils";
import type { CreatePlanRequest } from "@/lib/services/plans";

const STATUS_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

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

const inputClass =
  "w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

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

  const handleSubmit = async () => {
    setError(null);
    if (!form.planName.trim()) {
      setError("Plan name is required.");
      return;
    }
    setLoading(true);
    try {
      await api.create(form);
      toast.success("Plan created and linked successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create plan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add new plan"
      size="lg"
      position="right"
      footer={
        <ModalFooter
          onCancel={onClose}
          submitLabel={
            <>
              Add Plan <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </>
          }
          onSubmit={handleSubmit}
          loading={loading}
        />
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {error && (
          <div className="mb-4 rounded-[5px]">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Payer — read-only */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">Payer</label>
            <input
              type="text"
              value={payerName}
              disabled
              className={`${inputClass} bg-muted cursor-not-allowed`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Plan name *</label>
            <input type="text" value={form.planName} onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Aliases</label>
            <input type="text" value={form.aliases ?? ""} onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Plan ID prefix</label>
            <input type="text" value={form.planIdPrefix ?? ""} onChange={(e) => setForm((f) => ({ ...f, planIdPrefix: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Plan category</label>
            <select
              value={form.planCategory}
              onChange={(e) => {
                const cat = Number(e.target.value);
                const defaultType = CATEGORY_TO_TYPES[cat]?.[0] ?? 0;
                setForm((f) => ({ ...f, planCategory: cat, planType: defaultType }));
              }}
              className={inputClass}
            >
              {planCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Plan type</label>
            <select value={form.planType} onChange={(e) => setForm((f) => ({ ...f, planType: Number(e.target.value) }))} className={inputClass}>
              {filteredPlanTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Market type</label>
            <select value={form.marketType ?? ""} onChange={(e) => setForm((f) => ({ ...f, marketType: e.target.value ? Number(e.target.value) : null }))} className={inputClass}>
              <option value="">—</option>
              {marketTypes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">NSA category</label>
            <select value={form.nsaCategory ?? ""} onChange={(e) => setForm((f) => ({ ...f, nsaCategory: e.target.value ? Number(e.target.value) : null }))} className={inputClass}>
              <option value="">—</option>
              {nsaCategories.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.oonBenefits} onChange={(e) => setForm((f) => ({ ...f, oonBenefits: e.target.checked }))} className="rounded border-input" />
              <span className="text-sm text-foreground">OON benefits</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.nsaEligible} onChange={(e) => setForm((f) => ({ ...f, nsaEligible: e.target.checked }))} className="rounded border-input" />
              <span className="text-sm text-foreground">NSA eligible</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.providerParticipationApplicable} onChange={(e) => setForm((f) => ({ ...f, providerParticipationApplicable: e.target.checked }))} className="rounded border-input" />
              <span className="text-sm text-foreground">Provider participation applicable</span>
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Plan responsibility %</label>
            <input type="number" step="any" value={form.planResponsibilityPct ?? ""} onChange={(e) => setForm((f) => ({ ...f, planResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) }))} className={inputClass} placeholder="—" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Patient responsibility %</label>
            <input type="number" step="any" value={form.patientResponsibilityPct ?? ""} onChange={(e) => setForm((f) => ({ ...f, patientResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) }))} className={inputClass} placeholder="—" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Typical deductible</label>
            <input type="number" step="any" value={form.typicalDeductible ?? ""} onChange={(e) => setForm((f) => ({ ...f, typicalDeductible: e.target.value === "" ? null : Number(e.target.value) }))} className={inputClass} placeholder="—" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">OOP max</label>
            <input type="number" step="any" value={form.oopMax ?? ""} onChange={(e) => setForm((f) => ({ ...f, oopMax: e.target.value === "" ? null : Number(e.target.value) }))} className={inputClass} placeholder="—" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Timely filing initial (days)</label>
            <input type="number" value={form.timelyFilingInitialDays} onChange={(e) => setForm((f) => ({ ...f, timelyFilingInitialDays: Number(e.target.value) || 0 }))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Timely filing resubmission (days)</label>
            <input type="number" value={form.timelyFilingResubmissionDays ?? ""} onChange={(e) => setForm((f) => ({ ...f, timelyFilingResubmissionDays: e.target.value === "" ? null : Number(e.target.value) }))} className={inputClass} placeholder="—" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Timely filing appeal (days)</label>
            <input type="number" value={form.timelyFilingAppealDays} onChange={(e) => setForm((f) => ({ ...f, timelyFilingAppealDays: Number(e.target.value) || 0 }))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))} className={inputClass}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </form>
    </Modal>
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

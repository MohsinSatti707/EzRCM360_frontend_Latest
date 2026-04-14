"use client";

import { ArrowRight, XCircle } from "lucide-react";
import { DrawerForm } from "@/components/ui/DrawerForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect as Select } from "@/components/ui/Select";
import type {
  CreatePayerRequest,
  PayerAddressRequest,
  PayerPhoneRequest,
  PayerEmailRequest,
} from "@/lib/services/payers";
import type { SelectOption } from "@/components/ui/Select";
import type { PlanLookupDto } from "@/lib/services/lookups";
import type { PlanDetailDto } from "@/lib/services/plans";
import { ENUMS } from "@/lib/utils";

const STATUS_OPTIONS: SelectOption<number>[] = [
  { value: 0, label: "Inactive" },
  { value: 1, label: "Active" },
];

const INSURANCE_SUB_CATEGORY_OPTIONS: SelectOption<number | string>[] = [
  { value: "", label: "Select sub-category" },
  { value: 0, label: "Commercial" },
  { value: 1, label: "Medicaid" },
  { value: 2, label: "Medicare" },
  { value: 3, label: "MVA" },
  { value: 4, label: "Tricare" },
  { value: 5, label: "WC" },
  { value: 6, label: "HMO / Managed" },
  { value: 7, label: "Railroad Medicare" },
];

const emptyAddress: PayerAddressRequest = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  label: "",
};

const emptyPhone: PayerPhoneRequest = {
  phoneNumber: "",
  label: "",
};

const emptyEmail: PayerEmailRequest = {
  emailAddress: "",
  label: "",
};

export interface PayerFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreatePayerRequest;
  onFormChange: (form: CreatePayerRequest) => void;
  entityTypeOptions: { value: string; label: string }[];
  planOptions: PlanLookupDto[];
  linkedPlanDetails?: PlanDetailDto[];
  onRemovePlan?: (planId: string) => void;
  onSubmit: () => void;
  onSubmitAndAddPlan?: () => void;
  loading: boolean;
  error: string | null;
  onAddNewPlan?: () => void;
}

export function PayerFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  entityTypeOptions,
  planOptions,
  onSubmit,
  onSubmitAndAddPlan,
  linkedPlanDetails = [],
  onRemovePlan,
  loading,
  error,
  onAddNewPlan,
}: PayerFormModalProps) {
  const insuranceEntityTypeValue = entityTypeOptions.find(
    (opt) => opt.label.toLowerCase() === "insurance"
  )?.value;

  const isInsurance =
    insuranceEntityTypeValue !== undefined &&
    Number(insuranceEntityTypeValue) === Number(form.entityType);

  const addresses = form.addresses ?? [];
  const phoneNumbers = form.phoneNumbers ?? [];
  const emails = form.emails ?? [];

  const setAddresses = (list: PayerAddressRequest[]) =>
    onFormChange({ ...form, addresses: list });
  const setPhoneNumbers = (list: PayerPhoneRequest[]) =>
    onFormChange({ ...form, phoneNumbers: list });
  const setEmails = (list: PayerEmailRequest[]) =>
    onFormChange({ ...form, emails: list });
  const addAddress = () => setAddresses([...addresses, { ...emptyAddress }]);
  const removeAddress = (index: number) =>
    setAddresses(addresses.filter((_, i) => i !== index));
  const updateAddress = (index: number, field: keyof PayerAddressRequest, value: string | null) => {
    const next = [...addresses];
    next[index] = { ...next[index], [field]: value ?? "" };
    setAddresses(next);
  };

  const addPhone = () => setPhoneNumbers([...phoneNumbers, { ...emptyPhone }]);
  const removePhone = (index: number) =>
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
  const updatePhone = (index: number, field: keyof PayerPhoneRequest, value: string | null) => {
    const next = [...phoneNumbers];
    next[index] = { ...next[index], [field]: value ?? "" };
    setPhoneNumbers(next);
  };

  const addEmail = () => setEmails([...emails, { ...emptyEmail }]);
  const removeEmail = (index: number) =>
    setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, field: keyof PayerEmailRequest, value: string | null) => {
    const next = [...emails];
    next[index] = { ...next[index], [field]: value ?? "" };
    setEmails(next);
  };

  const planCategoryLabel = (v: number) =>
    Object.entries(ENUMS.PlanCategory).find(([, n]) => n === v)?.[0]?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? String(v);
  const planTypeLabel = (v: number) =>
    Object.entries(ENUMS.PlanType).find(([, n]) => n === v)?.[0]?.replace(/([a-z])([A-Z])/g, "$1 $2")?.toUpperCase() ?? String(v);

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Update Payer" : "Add Payer"}
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
                {editId ? "Update" : "Add Payer"} <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          {/* Add Payer & Add Plan button removed — plans managed on detail page */}
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
          <div className="mb-4 rounded-[5px]">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <Input
              label="Payer Name"
              required
              value={form.payerName}
              onChange={(e) => onFormChange({ ...form, payerName: e.target.value })}
            />
            <Input
              label="Payer Aliases"
              value={form.aliases ?? ""}
              onChange={(e) => onFormChange({ ...form, aliases: e.target.value })}
            />
            <Select
              label="Payer Entity Type"
              options={entityTypeOptions}
              value={form.entityType}
              onChange={(e) => onFormChange({ ...form, entityType: Number(e.target.value), insuranceSubCategory: Number(e.target.value) === Number(insuranceEntityTypeValue) ? form.insuranceSubCategory : null })}
            />
          </div>

          {!isInsurance && (
            <>
              {/* Addresses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Addresses</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                    Add address
                  </Button>
                </div>
                {addresses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No addresses. Click &quot;Add address&quot; to add one.
                  </p>
                )}
                {addresses.map((addr, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#E2E8F0] bg-[#F7F8F9] p-4 space-y-3"
                  >
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeAddress(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Address line 1"
                        value={addr.addressLine1}
                        onChange={(e) => updateAddress(index, "addressLine1", e.target.value)}
                      />
                      <Input
                        label="Address line 2"
                        value={addr.addressLine2 ?? ""}
                        onChange={(e) => updateAddress(index, "addressLine2", e.target.value)}
                      />
                      <Input
                        label="City"
                        value={addr.city}
                        onChange={(e) => updateAddress(index, "city", e.target.value)}
                      />
                      <Input
                        label="State"
                        value={addr.state}
                        onChange={(e) => updateAddress(index, "state", e.target.value)}
                      />
                      <Input
                        label="ZIP"
                        value={addr.zip}
                        onChange={(e) => updateAddress(index, "zip", e.target.value)}
                      />
                      <Input
                        label="Label (e.g. Billing)"
                        value={addr.label ?? ""}
                        onChange={(e) => updateAddress(index, "label", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Phone numbers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Phone numbers</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                    Add phone
                  </Button>
                </div>
                {phoneNumbers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No phone numbers.</p>
                )}
                {phoneNumbers.map((ph, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E8F0] bg-[#F7F8F9] p-4"
                  >
                    <div className="min-w-[200px] flex-1">
                      <Input
                        label="Phone number"
                        value={ph.phoneNumber}
                        onChange={(e) => updatePhone(index, "phoneNumber", e.target.value)}
                      />
                    </div>
                    <div className="min-w-[120px] flex-1">
                      <Input
                        label="Label"
                        value={ph.label ?? ""}
                        onChange={(e) => updatePhone(index, "label", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removePhone(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {/* Emails */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Emails</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                    Add email
                  </Button>
                </div>
                {emails.length === 0 && (
                  <p className="text-sm text-muted-foreground">No emails.</p>
                )}
                {emails.map((em, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E8F0] bg-[#F7F8F9] p-4"
                  >
                    <div className="min-w-[200px] flex-1">
                      <Input
                        label="Email address"
                        type="email"
                        value={em.emailAddress}
                        onChange={(e) => updateEmail(index, "emailAddress", e.target.value)}
                      />
                    </div>
                    <div className="min-w-[120px] flex-1">
                      <Input
                        label="Label"
                        value={em.label ?? ""}
                        onChange={(e) => updateEmail(index, "label", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeEmail(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Linked Plans */}
          {linkedPlanDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Linked Plan</h3>
              {linkedPlanDetails.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-[#E2E8F0]  p-4 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px] text-base   text-[#64748B] tracking-wide">Plan Name</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px] text-base text-[#2A2C33]">{plan.planName}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px] text-base text-[#64748B] tracking-wide">Plan ID</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px] text-base text-[#2A2C33]">{plan.planIdPrefix || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px] text-base text-[#64748B] tracking-wide">Plan Category</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px] text-base text-[#2A2C33]">{planCategoryLabel(plan.planCategory)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px]  text-base text-[#64748B] tracking-wide">Plan Type</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px]  text-base text-[#2A2C33]">{planTypeLabel(plan.planType)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px] text-base text-[#64748B] tracking-wide">Out-of-Network Benefits</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px] text-base text-[#2A2C33]">{plan.oonBenefits ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-['Aileron'] font-[14px] text-[#64748B] tracking-wide">NSA Eligible</p>
                      <p className="text-[14px] font-['Aileron'] font-[14px] text-base text-[#2A2C33]">{plan.nsaEligible ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  {onRemovePlan && (
                    <button
                      type="button"
                      onClick={() => onRemovePlan(plan.id)}
                      className="flex items-center gap-1 text-[13px] font-['Aileron'] font-semibold text-[#0066CC] hover:text-[#0066CC]/80"
                    >
                      <XCircle className="h-4 w-4" /> Remove Plan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </DrawerForm>
  );
}

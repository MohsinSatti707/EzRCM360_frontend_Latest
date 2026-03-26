"use client";

import { ArrowRight } from "lucide-react";
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

const STATUS_OPTIONS: SelectOption<number>[] = [
  { value: 0, label: "Inactive" },
  { value: 1, label: "Active" },
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
  const planIds = form.planIds ?? [];

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

  // Plans linked to this payer (read-only display)
  const linkedPlans = planOptions.filter((p) => planIds.includes(p.id));

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Edit Payer" : "Add Payer"}
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
          {!editId && isInsurance && onSubmitAndAddPlan && (
            <Button
              type="button"
              onClick={onSubmitAndAddPlan}
              disabled={loading}
              className="h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC]/80 hover:bg-[#0066CC]/70 text-white font-aileron text-[14px]"
            >
              {loading ? "Saving…" : "Add Payer & Add Plan"}
            </Button>
          )}
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
            <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Basic information</h3>
            <Input
              label="Payer name"
              required
              value={form.payerName}
              onChange={(e) => onFormChange({ ...form, payerName: e.target.value })}
            />
            <Input
              label="Aliases"
              value={form.aliases ?? ""}
              onChange={(e) => onFormChange({ ...form, aliases: e.target.value })}
            />
            <Select
              label="Entity type"
              options={entityTypeOptions}
              value={form.entityType}
              onChange={(e) => onFormChange({ ...form, entityType: Number(e.target.value) })}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => onFormChange({ ...form, status: Number(e.target.value) })}
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

          {isInsurance && (
            <div className="space-y-3">
              <h3 className="font-aileron text-sm font-semibold text-[#2A2C33]">Linked plans</h3>
              {linkedPlans.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-[#E2E8F0] p-3">
                  <div className="space-y-2">
                    {linkedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center gap-2 rounded bg-[#F7F8F9] px-3 py-2"
                      >
                        <span className="text-sm text-foreground">{plan.displayName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#E2E8F0] p-4 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    No plans linked to this payer.
                  </p>
                  {onAddNewPlan && editId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onAddNewPlan}
                    >
                      Add new plan
                    </Button>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    To link existing plans, go to Plan Configuration.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </DrawerForm>
  );
}

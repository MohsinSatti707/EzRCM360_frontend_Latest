import { PageShell } from "@/components/layout/PageShell";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";

const modulesMeta: Record<string, { title: string; description: string; iconBg: string }> = {
  credentialing:          { title: "EzCredentialing",        description: "Provider credentialing workflows and tracking will be available here.",               iconBg: "from-blue-100 to-blue-200" },
  enrollment:             { title: "EzEnrollment",           description: "Payer enrollment management and status tracking will be available here.",             iconBg: "from-indigo-100 to-indigo-200" },
  scheduler:              { title: "EzScheduler",            description: "Appointment scheduling and calendar management will be available here.",              iconBg: "from-cyan-100 to-cyan-200" },
  "benefits-verification":{ title: "EzBenefitsVerification", description: "Insurance benefits verification and eligibility checks will be available here.",      iconBg: "from-teal-100 to-teal-200" },
  "medical-records":      { title: "EzMedicalRecords",       description: "Medical records management and retrieval will be available here.",                    iconBg: "from-emerald-100 to-emerald-200" },
  auth:                   { title: "EzAuth",                 description: "Prior authorization management and tracking will be available here.",                 iconBg: "from-green-100 to-green-200" },
  "surgical-coordination":{ title: "EzSurgicalCoordination", description: "Surgical case coordination and scheduling will be available here.",                   iconBg: "from-lime-100 to-lime-200" },
  "medical-coding":       { title: "EzMedicalCoding",        description: "Medical coding workflows and validation will be available here.",                     iconBg: "from-yellow-100 to-yellow-200" },
  "claim-processing":     { title: "EzClaimProcessing",      description: "Claims processing, submission, and tracking will be available here.",                 iconBg: "from-amber-100 to-amber-200" },
  "payment-validation":   { title: "EzPaymentValidation",    description: "Payment validation and reconciliation will be available here.",                       iconBg: "from-orange-100 to-orange-200" },
  negotiations:           { title: "EzNegotiations",         description: "Payer negotiations and contract management will be available here.",                  iconBg: "from-red-100 to-red-200" },
  "ar-management":        { title: "EzARManagement",         description: "Accounts receivable management and follow-up will be available here.",                iconBg: "from-rose-100 to-rose-200" },
  "nsa-arbitration":      { title: "EzNSAArbitration",       description: "No Surprises Act arbitration and dispute resolution will be available here.",         iconBg: "from-pink-100 to-pink-200" },
  appeals:                { title: "EzAppeals",              description: "Claims appeals management and tracking will be available here.",                      iconBg: "from-fuchsia-100 to-fuchsia-200" },
  "mva-litigation":       { title: "EzMVALitigation",        description: "Motor vehicle accident litigation tracking will be available here.",                  iconBg: "from-purple-100 to-purple-200" },
  "patient-ar":           { title: "EzPatientAR",            description: "Patient accounts receivable and collections will be available here.",                 iconBg: "from-violet-100 to-violet-200" },
  "payment-posting":      { title: "EzPaymentPosting",       description: "Payment posting and reconciliation will be available here.",                          iconBg: "from-sky-100 to-sky-200" },
  "quality-assurance":    { title: "EzQualityAssurance",     description: "Quality assurance auditing and compliance will be available here.",                   iconBg: "from-slate-100 to-slate-200" },
  accounting:             { title: "EzAccounting",           description: "Accounting, financial reporting, and reconciliation will be available here.",          iconBg: "from-stone-100 to-stone-200" },
};

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = modulesMeta[slug] ?? {
    title: "Module",
    description: "This module will be available soon.",
    iconBg: "from-primary-100 to-primary-200",
  };

  return (
    <PageShell title={meta.title} description={`${meta.title} — Operational Module`}>
      <ComingSoonCard
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        title="Coming Soon"
        description={meta.description}
        iconBg={meta.iconBg}
      />
    </PageShell>
  );
}

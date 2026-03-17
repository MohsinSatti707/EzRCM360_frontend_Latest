import { PageShell } from "@/components/layout/PageShell";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";

export default function ContactSupportPage() {
  return (
    <PageShell title="Contact Support" description="Get in touch with the EzRCM360 support team.">
      <ComingSoonCard
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        title="Coming Soon"
        description="Support ticket submission, live chat, and direct contact options will be available here."
        iconBg="from-emerald-100 to-emerald-200"
      />
    </PageShell>
  );
}

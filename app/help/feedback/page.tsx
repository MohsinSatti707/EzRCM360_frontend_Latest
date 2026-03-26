import { PageShell } from "@/components/layout/PageShell";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";

export default function FeedbackPage() {
  return (
    <PageShell title="Feedback & Feature Requests" description="Share your feedback and suggest new features." titleWrapperClassName="mt-4 px-6">
      <ComingSoonCard
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        }
        title="Coming Soon"
        description="Submit feedback, request new features, and vote on community suggestions here."
        iconBg="from-violet-100 to-violet-200"
        className="mt-4 mx-6"
      />
    </PageShell>
  );
}

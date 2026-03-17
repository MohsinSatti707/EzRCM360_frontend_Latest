import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";

export default function RcmLandingPage() {
  return (
    <PageShell title="RCM Intelligence" description="Access RCM intelligence modules.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-[10px] border border-[#E2E8F0] bg-white p-4">
          <h2 className="mb-2 font-aileron text-[16px] font-semibold text-[#202830]">
            Insurance AR Analysis
          </h2>
          <p className="mb-3 text-sm text-[#64748B]">
            View and manage AR analysis sessions for payers and practices.
          </p>
          <Link
            href="/rcm/insurance-ar-analysis"
            className="text-sm font-aileron text-[#0066CC] hover:text-[#0052a3]"
          >
            Go to Insurance AR Analysis
          </Link>
        </Card>
      </div>
    </PageShell>
  );
}


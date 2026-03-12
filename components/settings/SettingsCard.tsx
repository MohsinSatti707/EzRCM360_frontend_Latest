import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";

export interface SettingsLink {
  label: string;
  href: string;
}

/** Matches design Settings.tsx: Card + CardContent, Separator, links with arrow */
export function SettingsCard({
  title,
  description,
  links,
  icon,
  className = "",
}: {
  title: string;
  description: string;
  links: SettingsLink[];
  icon?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex h-full min-h-0 flex-col rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] shadow-none", className)}>
      <CardContent className="flex flex-col gap-[10px] py-[16px] px-0">
        <div className="flex items-center gap-2.5 px-[20px]">
          {icon && (
            <div className="flex-shrink-0">
              <Image src={icon} alt={title} width={20} height={20} className="h-5 w-5" />
            </div>
          )}
          <h3 className="font-aileron text-[16px] font-semibold leading-none text-[#202830]">{title}</h3>
        </div>
        <Separator className="w-full bg-[#E2E8F0]" />
        <div className="px-[20px] flex flex-col gap-[10px]">
          <p className="font-aileron text-[14px] font-normal leading-[140%] text-[#64748B]">{description}</p>
          {links.length > 0 && (
            <div className="flex flex-col gap-3 mt-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 font-aileron text-[15px] font-normal leading-none text-[#0066CC] hover:text-[#0052a3] transition-colors group"
                >
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

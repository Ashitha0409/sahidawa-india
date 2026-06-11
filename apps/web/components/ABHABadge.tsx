"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface ABHABadgeProps {
    linked: boolean;
    abhaAddress?: string | null;
}

export default function ABHABadge({ linked, abhaAddress }: ABHABadgeProps) {
    const t = useTranslations("abha");

    if (linked) {
        return (
            <Link
                href="/abha-setup"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{t("linked_badge")}</span>
                {abhaAddress && (
                    <span className="ml-0.5 border-l border-emerald-300/40 pl-1.5 font-mono opacity-80">
                        {abhaAddress}
                    </span>
                )}
            </Link>
        );
    }

    return (
        <Link
            href="/abha-setup"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40"
        >
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{t("not_linked_badge")}</span>
            <span className="ml-0.5 border-l border-amber-300/40 pl-1.5 underline opacity-80">
                {t("link_now")}
            </span>
        </Link>
    );
}

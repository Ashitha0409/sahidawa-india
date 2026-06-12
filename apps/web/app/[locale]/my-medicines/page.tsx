"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "../components/PageHeader";
import { fetchTrackedMedicines, untrackMedicine, TrackedMedicine } from "@/lib/api/tracking";
import { Link } from "@/i18n/routing";
import { Calendar, Trash2, Package, Scan, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function MyMedicinesPage() {
    const t = useTranslations("ExpiryTracker");
    const [medicines, setMedicines] = useState<TrackedMedicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchTrackedMedicines();
            setMedicines(data || []);
        } catch (err: any) {
            console.error(err);
            toast.error(t("error_fetch"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await untrackMedicine(id);
            toast.success(t("success_delete"));
            setMedicines((prev) => prev.filter((m) => m.id !== id));
        } catch (err: any) {
            console.error(err);
            toast.error(t("error_delete"));
        }
    };

    const getDiffDays = (dateStr: string) => {
        const expiry = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getExpiryDetails = (dateStr: string) => {
        const days = getDiffDays(dateStr);
        if (days < 0) {
            return {
                label: t("expired"),
                colorClass: "bg-red-500",
                badgeClass:
                    "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
                progressPercent: 100,
            };
        }
        if (days < 7) {
            return {
                label: `${days} ${t("days_remaining")}`,
                colorClass: "bg-red-500",
                badgeClass:
                    "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
                progressPercent: 100 - Math.min(100, (days / 30) * 100),
            };
        }
        if (days < 14) {
            return {
                label: `${days} ${t("days_remaining")}`,
                colorClass: "bg-orange-500",
                badgeClass:
                    "text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-850",
                progressPercent: 100 - Math.min(100, (days / 30) * 100),
            };
        }
        if (days <= 30) {
            return {
                label: `${days} ${t("days_remaining")}`,
                colorClass: "bg-yellow-500",
                badgeClass:
                    "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-250 dark:border-yellow-800",
                progressPercent: 100 - Math.min(100, (days / 30) * 100),
            };
        }
        return {
            label: `${days} ${t("days_remaining")}`,
            colorClass: "bg-emerald-500",
            badgeClass:
                "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            progressPercent: Math.max(10, Math.min(100, ((180 - days) / 180) * 100)),
        };
    };

    return (
        <div className="min-h-screen bg-(--color-surface-page) text-(--color-text-primary) transition-colors duration-300">
            <PageHeader title={t("title")} subtitle={t("subtitle")} backHref="/" variant="light" />

            <main className="mx-auto max-w-6xl p-6 pt-32 md:pt-40">
                <div className="flex flex-col gap-6">
                    {/* Header Controls */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black tracking-tight">{t("title")}</h2>
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
                                {medicines.length}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => {
                                    setRefreshing(true);
                                    loadData(true);
                                }}
                                disabled={refreshing || loading}
                                className="flex items-center justify-center rounded-xl border border-(--color-border-muted) p-3 transition hover:bg-(--color-surface-muted)"
                                title="Refresh"
                            >
                                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                            </button>
                            <Link
                                href="/scan"
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 active:scale-95"
                            >
                                <Scan size={16} />
                                <span>Scan Barcode</span>
                            </Link>
                        </div>
                    </div>

                    {/* Expiry Color Code Guide */}
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-(--color-border-muted) bg-(--color-surface-muted) p-4 md:grid-cols-4">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                            <span>{t("color_green")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                            <span>{t("color_yellow")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                            <span>{t("color_orange")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="h-3 w-3 rounded-full bg-red-500"></span>
                            <span>{t("color_red")}</span>
                        </div>
                    </div>

                    {/* Content Section */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-32">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-semibold opacity-50">
                                Loading your medicines...
                            </p>
                        </div>
                    ) : medicines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-(--color-border-muted) bg-(--color-surface-muted) px-6 py-24 text-center">
                            <div className="mb-4 rounded-full bg-emerald-500/10 p-4 text-emerald-500">
                                <Package size={40} />
                            </div>
                            <h3 className="mb-1 text-xl font-bold">{t("empty_title")}</h3>
                            <p className="mb-6 max-w-md text-sm opacity-60">
                                {t("empty_description")}
                            </p>
                            <Link
                                href="/scan"
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                            >
                                <Scan size={16} />
                                <span>Scan Medicine to Start</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-(--color-border-muted) bg-(--color-surface-muted)">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-(--color-border-muted) bg-slate-50/50 text-xs font-bold uppercase opacity-60 dark:bg-slate-900/50">
                                            <th className="px-6 py-4">{t("medicine_name")}</th>
                                            <th className="px-6 py-4">{t("batch_number")}</th>
                                            <th className="px-6 py-4">{t("expiry_date")}</th>
                                            <th className="w-1/3 px-6 py-4">Expiry Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--color-border-muted)">
                                        {medicines.map((med) => {
                                            const expiryInfo = getExpiryDetails(med.expiry_date);
                                            return (
                                                <tr
                                                    key={med.id}
                                                    className="transition hover:bg-slate-50/35 dark:hover:bg-slate-900/35"
                                                >
                                                    <td className="px-6 py-5 font-bold text-(--color-text-primary)">
                                                        {med.medicine_name}
                                                    </td>
                                                    <td className="px-6 py-5 opacity-80">
                                                        {med.batch_number ? (
                                                            <span className="flex items-center gap-1.5 font-mono text-xs">
                                                                <Package
                                                                    size={12}
                                                                    className="opacity-50"
                                                                />
                                                                {med.batch_number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs italic opacity-45">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 opacity-80">
                                                        <span className="flex items-center gap-1.5 text-xs">
                                                            <Calendar
                                                                size={12}
                                                                className="opacity-50"
                                                            />
                                                            {new Date(
                                                                med.expiry_date
                                                            ).toLocaleDateString(undefined, {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between text-[11px] font-bold">
                                                                <span
                                                                    className={`rounded-full border px-2 py-0.5 ${expiryInfo.badgeClass}`}
                                                                >
                                                                    {expiryInfo.label}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${expiryInfo.colorClass}`}
                                                                    style={{
                                                                        width: `${expiryInfo.progressPercent}%`,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button
                                                            onClick={() => handleDelete(med.id)}
                                                            className="inline-flex rounded-full p-2 text-red-500 transition hover:bg-red-500/10"
                                                            title={t("delete_tooltip")}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft,
    FileText,
    ShieldCheck,
    AlertTriangle,
    RefreshCw,
    Calendar,
    Stethoscope,
    Building,
    Pill,
    Loader2,
    Clock,
    Plus,
} from "lucide-react";
import {
    fetchABHARecords,
    fetchABHAPrescriptions,
    ABHARecord,
    getABHAStatus,
} from "@/lib/api/abha";

const ACCESS_TOKEN_KEY = "sb-access-token";

export default function ABHARecordsPage() {
    const t = useTranslations("abha");

    const [isGuest, setIsGuest] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [records, setRecords] = useState<ABHARecord[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [abhaAddress, setAbhaAddress] = useState<string | null>(null);

    // Load records on mount
    const loadRecords = async (silent = false) => {
        if (!silent) setLoading(true);
        setErrorMsg(null);
        try {
            const data = await fetchABHARecords();
            setRecords(data);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load health records from SahiDawa.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
            setIsGuest(true);
            setLoading(false);
            return;
        }

        // Fetch abha status to show header details
        getABHAStatus()
            .then((res) => {
                if (res.linked && res.link) {
                    setAbhaAddress(res.link.abha_address);
                    loadRecords();
                } else {
                    // Not linked, redirect to setup
                    setIsGuest(false);
                    setLoading(false);
                }
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    // Sync/Fetch prescriptions from gateway
    const handleFetchPrescriptions = async () => {
        setSyncing(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            await fetchABHAPrescriptions();
            setSuccessMsg(t("prescriptions_fetched"));
            await loadRecords(true); // reload records list silently
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to sync prescriptions from ABDM gateway.");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-grow flex-col items-center justify-center bg-(--color-surface-muted) p-6">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
                <p className="mt-4 font-medium text-(--color-text-secondary)">
                    Fetching health record timeline...
                </p>
            </div>
        );
    }

    if (isGuest) {
        return (
            <div className="flex-grow bg-(--color-surface-muted) px-6 py-12 text-(--color-text-primary)">
                <div className="mx-auto max-w-lg rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-8 text-center shadow-lg">
                    <AlertTriangle className="mx-auto h-16 w-16 text-amber-500" />
                    <h1 className="mt-6 text-2xl font-black tracking-tight">Access Restricted</h1>
                    <p className="mt-3 text-(--color-text-secondary)">
                        Please sign in to view your linked ABHA health records timeline.
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href="/login?redirect=/abha-records"
                            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-md transition hover:bg-emerald-700"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!abhaAddress) {
        return (
            <div className="flex-grow bg-(--color-surface-muted) px-6 py-12 text-(--color-text-primary)">
                <div className="mx-auto max-w-lg rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-8 text-center shadow-lg">
                    <ShieldCheck className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                    <h1 className="mt-6 text-2xl font-black tracking-tight">ABHA ID Required</h1>
                    <p className="mt-3 text-(--color-text-secondary)">
                        You need to link your Ayushman Bharat Health Account (ABHA) to store
                        medicine histories and fetch prescriptions.
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href="/abha-setup"
                            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-md transition hover:bg-emerald-700"
                        >
                            {t("link_now")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow bg-(--color-surface-muted) px-6 py-10 text-(--color-text-primary)">
            <div className="mx-auto max-w-3xl">
                {/* Back button */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-(--color-text-secondary) transition hover:bg-(--color-surface-page) hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                        <ArrowLeft size={18} />
                        <span>{t("back_to_profile")}</span>
                    </Link>

                    {/* Sync Action */}
                    <button
                        onClick={handleFetchPrescriptions}
                        disabled={syncing}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                        <span>{syncing ? t("fetching") : t("fetch_prescriptions")}</span>
                    </button>
                </div>

                {/* Header info */}
                <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{t("records_title")}</h1>
                        <p className="mt-1 text-sm text-(--color-text-secondary)">
                            {t("records_subtitle")}
                        </p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-2 font-mono text-xs font-bold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                        {abhaAddress}
                    </div>
                </div>

                {/* Status Messages */}
                {errorMsg && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-950/20 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <span>{errorMsg}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Records Timeline */}
                {records.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-(--color-border-muted) bg-(--color-surface-page) p-12 text-center">
                        <FileText className="mx-auto h-16 w-16 text-(--color-text-muted)" />
                        <h3 className="mt-4 text-lg font-bold">No Records Found</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-(--color-text-secondary)">
                            {t("no_records")}
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={handleFetchPrescriptions}
                                disabled={syncing}
                                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-600/30 px-5 py-3 font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/10"
                            >
                                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                                <span>Fetch Prescriptions Now</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative ml-4 space-y-8 border-l-2 border-(--color-border-muted) pl-6">
                        {records.map((record) => {
                            const isVerification = record.record_type === "verification";
                            const dateObj = new Date(record.synced_at);

                            return (
                                <div key={record.id} className="group relative">
                                    {/* Icon Indicator on Timeline */}
                                    <div className="absolute top-1.5 -left-[35px] flex h-7.5 w-7.5 items-center justify-center rounded-full border-2 border-emerald-600 bg-(--color-surface-page) text-emerald-600 shadow-sm transition-colors duration-250 group-hover:bg-emerald-600 group-hover:text-white dark:border-emerald-400 dark:text-emerald-400 dark:group-hover:bg-emerald-400">
                                        {isVerification ? (
                                            <ShieldCheck size={14} />
                                        ) : (
                                            <FileText size={14} />
                                        )}
                                    </div>

                                    {/* Card */}
                                    <div className="rounded-2xl border border-(--color-border-muted) bg-(--color-surface-page) p-6 shadow-sm transition-shadow hover:shadow-md">
                                        {/* Card Header */}
                                        <div className="mb-4 flex flex-col gap-2 border-b border-(--color-border-muted) pb-4 sm:flex-row sm:items-center sm:justify-between">
                                            <span
                                                className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold tracking-wide uppercase ${
                                                    isVerification
                                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                                                        : "bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
                                                }`}
                                            >
                                                {isVerification
                                                    ? t("record_type_verification")
                                                    : t("record_type_prescription")}
                                            </span>

                                            <div className="flex items-center gap-1.5 text-xs font-medium text-(--color-text-secondary)">
                                                <Calendar size={14} />
                                                <span>
                                                    {dateObj.toLocaleDateString()} at{" "}
                                                    {dateObj.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        {isVerification ? (
                                            <div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-black tracking-tight text-(--color-text-primary)">
                                                            {record.record_data?.verification_result
                                                                ?.medicine?.brand_name ||
                                                                "Unknown Medicine"}
                                                        </h3>
                                                        <p className="mt-0.5 text-xs font-semibold text-(--color-text-secondary)">
                                                            {record.record_data?.verification_result
                                                                ?.medicine?.generic_name ||
                                                                "Unknown Generic"}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase ${
                                                            record.record_data?.verification_result
                                                                ?.verified
                                                                ? "bg-emerald-600 text-white"
                                                                : "bg-amber-600 text-white"
                                                        }`}
                                                    >
                                                        {record.record_data?.verification_result
                                                            ?.verified
                                                            ? "Genuine"
                                                            : "Suspicious"}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid gap-3 rounded-xl bg-(--color-surface-muted) p-4 text-xs font-medium sm:grid-cols-2">
                                                    <div>
                                                        <span className="mb-0.5 block text-(--color-text-secondary)">
                                                            Manufacturer
                                                        </span>
                                                        <span className="font-bold">
                                                            {record.record_data?.verification_result
                                                                ?.medicine?.manufacturer || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="mb-0.5 block text-(--color-text-secondary)">
                                                            Batch Number
                                                        </span>
                                                        <span className="font-mono font-bold">
                                                            {record.record_data?.verification_result
                                                                ?.medicine?.batch_number || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="mb-0.5 block text-(--color-text-secondary)">
                                                            Scanned At
                                                        </span>
                                                        <span className="font-bold">
                                                            {record.record_data?.scanned_at
                                                                ? new Date(
                                                                      record.record_data.scanned_at
                                                                  ).toLocaleString()
                                                                : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="mb-0.5 block text-(--color-text-secondary)">
                                                            CDSCO Status
                                                        </span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            {record.record_data?.verification_result
                                                                ?.medicine?.cdsco_approval_status ||
                                                                "Approved"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Prescription Details */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-sm text-(--color-text-primary)">
                                                        <Stethoscope
                                                            size={16}
                                                            className="shrink-0 text-blue-500"
                                                        />
                                                        <span className="font-semibold">
                                                            {t("doctor")}:
                                                        </span>
                                                        <span className="font-bold">
                                                            {record.record_data?.doctorName}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-(--color-text-primary)">
                                                        <Building
                                                            size={16}
                                                            className="shrink-0 text-blue-500"
                                                        />
                                                        <span className="font-semibold">
                                                            {t("hospital")}:
                                                        </span>
                                                        <span className="font-bold">
                                                            {record.record_data?.hospitalName}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 border-t border-(--color-border-muted) pt-4">
                                                        <div className="mb-3 flex items-center gap-1.5">
                                                            <Pill
                                                                size={16}
                                                                className="text-blue-600 dark:text-blue-400"
                                                            />
                                                            <h4 className="text-sm font-extrabold text-(--color-text-primary)">
                                                                {t("medicines")}
                                                            </h4>
                                                        </div>

                                                        <div className="overflow-x-auto rounded-xl border border-(--color-border-muted)">
                                                            <table className="min-w-full divide-y divide-(--color-border-muted) text-left text-xs font-semibold">
                                                                <thead className="bg-(--color-surface-muted) text-(--color-text-secondary)">
                                                                    <tr>
                                                                        <th className="px-4 py-2.5 font-bold">
                                                                            {t("medicine_name")}
                                                                        </th>
                                                                        <th className="px-4 py-2.5 font-bold">
                                                                            {t("dosage")}
                                                                        </th>
                                                                        <th className="px-4 py-2.5 font-bold">
                                                                            {t("frequency")}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-(--color-border-muted) bg-(--color-surface-page) text-(--color-text-primary)">
                                                                    {(
                                                                        record.record_data
                                                                            ?.medicines || []
                                                                    ).map(
                                                                        (med: any, idx: number) => (
                                                                            <tr
                                                                                key={idx}
                                                                                className="hover:bg-(--color-surface-muted)/40"
                                                                            >
                                                                                <td className="px-4 py-2.5 font-extrabold">
                                                                                    {med.name}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 font-mono">
                                                                                    {med.dosage}
                                                                                </td>
                                                                                <td className="px-4 py-2.5">
                                                                                    {med.frequency}
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

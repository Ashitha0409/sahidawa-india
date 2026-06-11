"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft,
    ShieldCheck,
    KeyRound,
    UserCheck,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Trash2,
    ExternalLink,
} from "lucide-react";
import { getABHAStatus, linkABHA, verifyABHAOTP, unlinkABHA, ABHALink } from "@/lib/api/abha";

const ACCESS_TOKEN_KEY = "sb-access-token";

export default function ABHASetupPage() {
    const t = useTranslations("abha");

    const [isGuest, setIsGuest] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    // Form inputs & loading states
    const [abhaAddressInput, setAbhaAddressInput] = useState("");
    const [otpInput, setOtpInput] = useState("");
    const [txnId, setTxnId] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Linked status state
    const [linkDetails, setLinkDetails] = useState<ABHALink | null>(null);

    // Check auth session and existing status
    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
            setIsGuest(true);
            setCheckingSession(false);
            return;
        }

        // Fetch current link status
        getABHAStatus()
            .then((res) => {
                if (res.linked && res.link) {
                    setLinkDetails(res.link);
                    setCurrentStep(3);
                }
            })
            .catch((err) => {
                console.error("Error fetching ABHA status", err);
            })
            .finally(() => {
                setCheckingSession(false);
            });
    }, []);

    // Step 1: Send OTP
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!abhaAddressInput.includes("@")) {
            setErrorMessage("Please enter a valid ABHA address containing '@' (e.g., name@abdm)");
            return;
        }

        setLoading(true);
        try {
            const res = await linkABHA(abhaAddressInput.trim());
            setTxnId(res.txn_id);
            setCurrentStep(2);
        } catch (err: any) {
            setErrorMessage(
                err.message || "Failed to initiate ABHA link. Please check the address."
            );
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (otpInput.length < 6) {
            setErrorMessage("Please enter the 6-digit verification code.");
            return;
        }

        setLoading(true);
        try {
            await verifyABHAOTP(txnId, otpInput.trim());

            // Reload status to populate details
            const statusRes = await getABHAStatus();
            if (statusRes.link) {
                setLinkDetails(statusRes.link);
            }
            setSuccessMessage("ABHA account linked successfully!");
            setCurrentStep(3);
        } catch (err: any) {
            setErrorMessage(err.message || "OTP verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Unlink account
    const handleUnlink = async () => {
        if (
            !confirm(
                "Are you sure you want to unlink your ABHA account? This will remove SahiDawa's access to your health records."
            )
        ) {
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
            await unlinkABHA();
            setLinkDetails(null);
            setAbhaAddressInput("");
            setOtpInput("");
            setTxnId("");
            setSuccessMessage(t("unlinked_success"));
            setCurrentStep(1);
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to unlink account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="flex flex-grow flex-col items-center justify-center bg-(--color-surface-muted) p-6">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
                <p className="mt-4 font-medium text-(--color-text-secondary)">
                    Checking your health profile...
                </p>
            </div>
        );
    }

    if (isGuest) {
        return (
            <div className="flex-grow bg-(--color-surface-muted) px-6 py-12 text-(--color-text-primary)">
                <div className="mx-auto max-w-lg rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-8 text-center shadow-lg">
                    <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
                    <h1 className="mt-6 text-2xl font-black tracking-tight">Access Restricted</h1>
                    <p className="mt-3 text-(--color-text-secondary)">
                        You must be signed in to link your Ayushman Bharat Health Account (ABHA) and
                        store verification history.
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href={`/login?redirect=/abha-setup`}
                            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-md transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            Sign In / Register
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-2xl border border-(--color-border-muted) px-6 py-3.5 font-bold text-(--color-text-secondary) transition hover:bg-(--color-surface-muted)"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow bg-(--color-surface-muted) px-6 py-10 text-(--color-text-primary)">
            <div className="mx-auto max-w-2xl">
                {/* Back Link */}
                <Link
                    href="/profile"
                    className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-(--color-text-secondary) transition hover:bg-(--color-surface-page) hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Profile</span>
                </Link>

                {/* Header Banner */}
                <div className="mb-8 text-center sm:text-left">
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1>
                    <p className="mt-2.5 text-base leading-relaxed text-(--color-text-secondary)">
                        {t("subtitle")}
                    </p>
                </div>

                {/* Status Banners */}
                {errorMessage && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-950/20 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <span>{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Steps Timeline Indicator */}
                <div className="mb-8 flex items-center justify-between px-4 sm:px-8">
                    <div className="flex flex-col items-center">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-sm transition-all ${
                                currentStep >= 1
                                    ? "bg-emerald-600 text-white"
                                    : "bg-(--color-surface-page) text-(--color-text-muted)"
                            }`}
                        >
                            1
                        </div>
                        <span className="mt-2 text-xs font-semibold text-(--color-text-secondary)">
                            Address
                        </span>
                    </div>
                    <div
                        className={`mx-4 h-0.5 flex-grow transition-colors ${currentStep >= 2 ? "bg-emerald-600" : "bg-(--color-border-muted)"}`}
                    />
                    <div className="flex flex-col items-center">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-sm transition-all ${
                                currentStep >= 2
                                    ? "bg-emerald-600 text-white"
                                    : "bg-(--color-surface-page) text-(--color-text-muted)"
                            }`}
                        >
                            2
                        </div>
                        <span className="mt-2 text-xs font-semibold text-(--color-text-secondary)">
                            Verify
                        </span>
                    </div>
                    <div
                        className={`mx-4 h-0.5 flex-grow transition-colors ${currentStep >= 3 ? "bg-emerald-600" : "bg-(--color-border-muted)"}`}
                    />
                    <div className="flex flex-col items-center">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-sm transition-all ${
                                currentStep === 3
                                    ? "bg-emerald-600 text-white"
                                    : "bg-(--color-surface-page) text-(--color-text-muted)"
                            }`}
                        >
                            3
                        </div>
                        <span className="mt-2 text-xs font-semibold text-(--color-text-secondary)">
                            Linked
                        </span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-8 shadow-sm">
                    {currentStep === 1 && (
                        <form onSubmit={handleSendOTP}>
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-xl font-bold tracking-tight">
                                    {t("step1_title")}
                                </h2>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-(--color-text-secondary)">
                                {t("step1_desc")}
                            </p>

                            <div className="mt-6">
                                <label
                                    htmlFor="abhaAddress"
                                    className="mb-2 block text-sm font-bold text-(--color-text-primary)"
                                >
                                    {t("abha_address_label")}
                                </label>
                                <input
                                    id="abhaAddress"
                                    type="text"
                                    required
                                    value={abhaAddressInput}
                                    onChange={(e) => setAbhaAddressInput(e.target.value)}
                                    placeholder={t("abha_address_placeholder")}
                                    className="w-full rounded-2xl border border-(--color-border-muted) bg-(--color-surface-muted) px-4 py-3.5 font-medium placeholder-(--color-text-muted) transition focus:border-emerald-500 focus:bg-(--color-surface-page) focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                                />
                            </div>

                            <div className="mt-8 flex items-center justify-between gap-4 border-t border-(--color-border-muted) pt-6">
                                <a
                                    href="https://abdm.gov.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                    <span>Create New ABHA</span>
                                    <ExternalLink size={14} />
                                </a>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t("send_otp")}
                                </button>
                            </div>
                        </form>
                    )}

                    {currentStep === 2 && (
                        <form onSubmit={handleVerifyOTP}>
                            <div className="flex items-center gap-3">
                                <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-xl font-bold tracking-tight">
                                    {t("step2_title")}
                                </h2>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-(--color-text-secondary)">
                                {t("step2_desc")}
                            </p>

                            <div className="mt-6">
                                <label
                                    htmlFor="otpCode"
                                    className="mb-2 block text-sm font-bold text-(--color-text-primary)"
                                >
                                    {t("otp_label")}
                                </label>
                                <input
                                    id="otpCode"
                                    type="text"
                                    required
                                    maxLength={6}
                                    pattern="\d{6}"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Enter 6-digit OTP"
                                    className="w-full rounded-2xl border border-(--color-border-muted) bg-(--color-surface-muted) px-4 py-3.5 text-center text-xl font-black tracking-widest placeholder-(--color-text-muted) transition focus:border-emerald-500 focus:bg-(--color-surface-page) focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                                />
                            </div>

                            <div className="mt-8 flex items-center justify-between gap-4 border-t border-(--color-border-muted) pt-6">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="text-sm font-semibold text-(--color-text-secondary) hover:text-(--color-text-primary)"
                                >
                                    Change Address
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t("verify_otp")}
                                </button>
                            </div>
                        </form>
                    )}

                    {currentStep === 3 && linkDetails && (
                        <div>
                            {/* Certificate Panel */}
                            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/20 p-6 dark:bg-emerald-950/5">
                                <div className="absolute -top-4 -right-4 opacity-10">
                                    <Building2 size={120} className="text-emerald-600" />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                            <UserCheck size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-emerald-800 dark:text-emerald-400">
                                                {t("step3_title")}
                                            </h3>
                                            <p className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-500">
                                                Ayushman Bharat Digital Mission
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white uppercase">
                                        Active
                                    </span>
                                </div>

                                <div className="mt-6 grid gap-4 border-t border-emerald-500/10 pt-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <span className="text-xs font-semibold text-(--color-text-secondary)">
                                            {t("linked_address")}
                                        </span>
                                        <p className="mt-1 font-bold text-(--color-text-primary)">
                                            {linkDetails.abha_address}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-(--color-text-secondary)">
                                            {t("linked_number")}
                                        </span>
                                        <p className="mt-1 font-mono font-bold tracking-wider text-(--color-text-primary)">
                                            {linkDetails.abha_number}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-xs font-semibold text-(--color-text-secondary)">
                                            Linked Since
                                        </span>
                                        <p className="mt-1 text-xs font-bold text-(--color-text-primary)">
                                            {new Date(linkDetails.linked_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-4 border-t border-(--color-border-muted) pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href="/abha-records"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700"
                                >
                                    <ShieldCheck size={18} />
                                    <span>{t("view_records")}</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleUnlink}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200/50 bg-red-50/20 px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:border-red-950/30 dark:bg-red-950/5 dark:text-red-400 dark:hover:bg-red-950/10"
                                >
                                    <Trash2 size={16} />
                                    <span>{t("unlink")}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

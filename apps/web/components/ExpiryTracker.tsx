"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { trackMedicine } from "@/lib/api/tracking";
import { Calendar, Package, FileText } from "lucide-react";
import { toast } from "sonner";

interface TrackExpiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMedicineName: string;
    initialBatchNumber: string;
    initialExpiryDate: string;
    medicineId: string;
}

export function TrackExpiryModal({
    isOpen,
    onClose,
    initialMedicineName,
    initialBatchNumber,
    initialExpiryDate,
    medicineId,
}: TrackExpiryModalProps) {
    const t = useTranslations("ExpiryTracker");
    const [medName, setMedName] = useState(initialMedicineName);
    const [batchNum, setBatchNum] = useState(initialBatchNumber);
    const [expiry, setExpiry] = useState(initialExpiryDate);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMedName(initialMedicineName || "");
        setBatchNum(initialBatchNumber || "");

        if (initialExpiryDate) {
            try {
                const d = new Date(initialExpiryDate);
                if (!isNaN(d.getTime())) {
                    setExpiry(d.toISOString().split("T")[0]);
                } else {
                    setExpiry("");
                }
            } catch {
                setExpiry("");
            }
        } else {
            setExpiry("");
        }
    }, [initialMedicineName, initialBatchNumber, initialExpiryDate, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medName || !expiry) {
            toast.error("Medicine name and expiry date are required");
            return;
        }

        setLoading(true);
        try {
            await trackMedicine({
                medicine_id: medicineId || "manual",
                medicine_name: medName,
                batch_number: batchNum || null,
                expiry_date: expiry,
            });
            toast.success(t("success_add"));
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t("error_add"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md scale-95 transform rounded-3xl border border-(--color-border-muted) bg-(--color-surface-page) p-6 shadow-2xl transition-all duration-300 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-text-primary)">
                        {t("add_medicine")}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <span className="sr-only">Close</span>
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold tracking-wider uppercase opacity-60">
                            {t("medicine_name")}
                        </label>
                        <div className="relative">
                            <FileText
                                size={16}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                required
                                value={medName}
                                onChange={(e) => setMedName(e.target.value)}
                                className="w-full rounded-xl border border-(--color-border-muted) bg-(--color-surface-muted) py-3 pr-3 pl-10 text-sm text-(--color-text-primary) outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={t("placeholder_med_name")}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold tracking-wider uppercase opacity-60">
                            {t("batch_number")}
                        </label>
                        <div className="relative">
                            <Package
                                size={16}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={batchNum}
                                onChange={(e) => setBatchNum(e.target.value)}
                                className="w-full rounded-xl border border-(--color-border-muted) bg-(--color-surface-muted) py-3 pr-3 pl-10 text-sm text-(--color-text-primary) outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={t("placeholder_batch")}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold tracking-wider uppercase opacity-60">
                            {t("expiry_date")}
                        </label>
                        <div className="relative">
                            <Calendar
                                size={16}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="date"
                                required
                                value={expiry}
                                onChange={(e) => setExpiry(e.target.value)}
                                className="w-full rounded-xl border border-(--color-border-muted) bg-(--color-surface-muted) py-3 pr-3 pl-10 text-sm text-(--color-text-primary) [color-scheme:light] outline-none focus:ring-2 focus:ring-emerald-500 dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-(--color-border-muted) py-3 text-sm font-semibold transition hover:bg-(--color-surface-muted)"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? t("button_tracking") : t("track_button")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

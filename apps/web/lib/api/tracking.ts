import { API_BASE, getCsrfToken } from "../api";
import { fetchWithRetry } from "../apiWithRetry";

export interface TrackedMedicine {
    id: string;
    user_id?: string | null;
    session_id?: string | null;
    medicine_id: string;
    medicine_name: string;
    batch_number?: string | null;
    expiry_date: string;
    notified_7d: boolean;
    notified_14d: boolean;
    notified_30d: boolean;
    created_at: string;
}

export interface TrackMedicinePayload {
    medicine_id: string;
    medicine_name: string;
    batch_number?: string | null;
    expiry_date: string;
}

function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";
    let sessionId = localStorage.getItem("sahidawa_session_id");
    if (!sessionId) {
        sessionId = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem("sahidawa_session_id", sessionId);
    }
    return sessionId;
}

/**
 * Fetches list of user's tracked medicines.
 */
export async function fetchTrackedMedicines(signal?: AbortSignal): Promise<TrackedMedicine[]> {
    const sessionId = getOrCreateSessionId();

    const headers: Record<string, string> = {};
    if (sessionId) {
        headers["x-session-id"] = sessionId;
    }

    const res = await fetchWithRetry(`${API_BASE}/api/v1/medicines/tracked`, {
        method: "GET",
        headers,
        credentials: "include",
        timeout: 10000,
        signal,
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch tracked medicines.");
    }

    return res.json() as Promise<TrackedMedicine[]>;
}

/**
 * Saves a medicine with batch number and expiry date.
 */
export async function trackMedicine(
    payload: TrackMedicinePayload,
    signal?: AbortSignal
): Promise<TrackedMedicine> {
    const csrfToken = await getCsrfToken();
    const sessionId = getOrCreateSessionId();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
    };
    if (sessionId) {
        headers["x-session-id"] = sessionId;
    }

    const res = await fetchWithRetry(`${API_BASE}/api/v1/medicines/track`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
            ...payload,
            session_id: sessionId,
        }),
        timeout: 10000,
        signal,
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to track medicine.");
    }

    const result = await res.json();
    return result.data as TrackedMedicine;
}

/**
 * Removes a tracked medicine entry.
 */
export async function untrackMedicine(id: string, signal?: AbortSignal): Promise<void> {
    const csrfToken = await getCsrfToken();
    const sessionId = getOrCreateSessionId();

    const headers: Record<string, string> = {
        "x-csrf-token": csrfToken,
    };
    if (sessionId) {
        headers["x-session-id"] = sessionId;
    }

    const res = await fetchWithRetry(`${API_BASE}/api/v1/medicines/track/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
        timeout: 10000,
        signal,
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete tracked medicine.");
    }
}

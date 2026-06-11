import { API_BASE, getCsrfToken } from "../api";

function getToken(): string {
    if (typeof window === "undefined") return "";

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            try {
                const sessionStr = localStorage.getItem(key);
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    return session.access_token || "";
                }
            } catch {
                return "";
            }
        }
    }
    return localStorage.getItem("sb-access-token") ?? "";
}

function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ABHALink {
    id: string;
    abha_address: string;
    abha_number: string;
    is_active: boolean;
    linked_at: string;
    last_synced_at: string | null;
}

export interface ABHAStatusResponse {
    linked: boolean;
    link: ABHALink | null;
}

export interface ABHARecord {
    id: string;
    user_id: string;
    abha_link_id: string;
    record_type: "verification" | "prescription";
    record_data: any;
    synced_at: string;
}

export interface ABHAPrescription {
    id: string;
    doctorName: string;
    hospitalName: string;
    date: string;
    medicines: Array<{ name: string; dosage: string; frequency: string }>;
}

/**
 * Check if the user is linked to an ABHA ID.
 */
export async function getABHAStatus(): Promise<ABHAStatusResponse> {
    const res = await fetch(`${API_BASE}/api/v1/abha/status`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        throw new Error("Failed to fetch ABHA status");
    }
    return res.json();
}

/**
 * Initiate ABHA linking via OTP request.
 */
export async function linkABHA(abhaAddress: string): Promise<{ txn_id: string }> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/api/v1/abha/link`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
            ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ abha_address: abhaAddress }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initiate ABHA linking");
    }
    return res.json();
}

/**
 * Verify OTP code to complete linking process.
 */
export async function verifyABHAOTP(
    txnId: string,
    otp: string
): Promise<{ success: boolean; abha_address: string; abha_number: string }> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/api/v1/abha/verify-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
            ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ txn_id: txnId, otp }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to verify OTP");
    }
    return res.json();
}

/**
 * Push a verified medicine scan result to user's ABHA account.
 */
export async function uploadVerificationToABHA(
    medicineId: string,
    verificationResult: any,
    scannedAt: string
): Promise<{ success: boolean }> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/api/v1/abha/upload-verification`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
            ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
            medicine_id: medicineId,
            verification_result: verificationResult,
            scanned_at: scannedAt,
        }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload verification to ABHA");
    }
    return res.json();
}

/**
 * Fetch prescriptions from the linked ABHA account.
 */
export async function fetchABHAPrescriptions(): Promise<ABHAPrescription[]> {
    const res = await fetch(`${API_BASE}/api/v1/abha/prescriptions`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch ABHA prescriptions");
    }
    return res.json();
}

/**
 * Retrieve local history of all synced/uploaded ABHA records (scan verifications and prescriptions).
 */
export async function fetchABHARecords(): Promise<ABHARecord[]> {
    const res = await fetch(`${API_BASE}/api/v1/abha/records`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch ABHA records");
    }
    return res.json();
}

/**
 * Unlink the user's ABHA health record.
 */
export async function unlinkABHA(): Promise<{ success: boolean }> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/api/v1/abha/unlink`, {
        method: "DELETE",
        headers: {
            "x-csrf-token": csrfToken,
            ...authHeaders(),
        },
        credentials: "include",
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unlink ABHA");
    }
    return res.json();
}

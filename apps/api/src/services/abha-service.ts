import crypto from "crypto";
import logger from "../utils/logger";

export interface ABHADocument {
    documentType: string;
    documentContent: string; // base64 representation of PDF or verification JSON
    fileName: string;
}

export interface PrescriptionMedicine {
    name: string;
    dosage: string;
    frequency: string;
}

export interface Prescription {
    id: string;
    doctorName: string;
    hospitalName: string;
    date: string;
    medicines: PrescriptionMedicine[];
}

export interface ABHAService {
    generateOTP(abhaAddress: string): Promise<{ txnId: string }>;
    verifyOTP(
        txnId: string,
        otp: string
    ): Promise<{ token: string; abhaNumber: string; abhaAddress: string }>;
    uploadDocument(abhaToken: string, document: ABHADocument): Promise<boolean>;
    getPrescriptions(abhaToken: string): Promise<Prescription[]>;
}

// In-memory store for pending OTP sessions
interface PendingSession {
    abhaAddress: string;
    abhaNumber: string;
    otp: string;
    createdAt: number;
}

const pendingSessions = new Map<string, PendingSession>();

// Cleanup expired sessions every 5 minutes (TTL of 10 minutes)
setInterval(
    () => {
        const now = Date.now();
        for (const [txnId, session] of pendingSessions.entries()) {
            if (now - session.createdAt > 10 * 60 * 1000) {
                pendingSessions.delete(txnId);
            }
        }
    },
    5 * 60 * 1000
);

export const abhaService: ABHAService = {
    async generateOTP(abhaAddress: string): Promise<{ txnId: string }> {
        logger.info("ABHA: Initiating OTP generation for address", { abhaAddress });

        // Validate ABHA address format (e.g. name@abdm or name@sbx)
        if (!abhaAddress || !abhaAddress.includes("@")) {
            throw new Error("Invalid ABHA address format. Must contain '@' (e.g., user@abdm)");
        }

        const txnId = `txn_${crypto.randomUUID()}`;
        // Standard sandbox mock OTP is 123456
        const otp = "123456";

        // Generate a random ABHA number in the format XX-XXXX-XXXX-XXXX
        const randPart = () => Math.floor(1000 + Math.random() * 9000).toString();
        const abhaNumber = `91-${randPart()}-${randPart()}-${randPart()}`;

        pendingSessions.set(txnId, {
            abhaAddress,
            abhaNumber,
            otp,
            createdAt: Date.now(),
        });

        logger.info(
            `ABHA OTP Generated successfully. TXN ID: ${txnId}. Mock OTP is ${otp} for testing.`
        );
        return { txnId };
    },

    async verifyOTP(
        txnId: string,
        otp: string
    ): Promise<{ token: string; abhaNumber: string; abhaAddress: string }> {
        logger.info("ABHA: Verifying OTP for transaction", { txnId });

        const session = pendingSessions.get(txnId);
        if (!session) {
            throw new Error("Transaction expired or invalid. Please request a new OTP.");
        }

        // Accept the generated OTP (123456)
        if (otp !== session.otp && otp !== "123456") {
            throw new Error("Invalid OTP. For testing, use 123456.");
        }

        const abhaToken = `abha_tok_${crypto.randomBytes(32).toString("hex")}`;
        const abhaNumber = session.abhaNumber;
        const abhaAddress = session.abhaAddress;

        // Session consumed, remove it
        pendingSessions.delete(txnId);

        logger.info("ABHA: OTP verified successfully", { abhaNumber });
        return { token: abhaToken, abhaNumber, abhaAddress };
    },

    async uploadDocument(abhaToken: string, document: ABHADocument): Promise<boolean> {
        logger.info("ABHA: Uploading document to health record", {
            documentType: document.documentType,
            fileName: document.fileName,
        });

        if (!abhaToken.startsWith("abha_tok_")) {
            logger.warn("ABHA: Invalid token pattern used for upload");
            return false;
        }

        // Simulate network delay and ABDM API upload response
        await new Promise((resolve) => setTimeout(resolve, 500));

        logger.info("ABHA: Document uploaded successfully to National Health Gateway");
        return true;
    },

    async getPrescriptions(abhaToken: string): Promise<Prescription[]> {
        logger.info("ABHA: Fetching prescriptions using token");

        if (!abhaToken.startsWith("abha_tok_")) {
            throw new Error("Invalid or expired ABHA session token");
        }

        // Simulate fetching prescriptions from NHA Document management sandbox
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Return a mock set of prescriptions for the user
        return [
            {
                id: `pr_${crypto.randomBytes(8).toString("hex")}`,
                doctorName: "Dr. Arvind Kumar",
                hospitalName: "All India Institute of Medical Sciences (AIIMS)",
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 days ago
                medicines: [
                    {
                        name: "Paracetamol 650mg",
                        dosage: "1 tablet",
                        frequency: "Three times a day",
                    },
                    { name: "Amoxicillin 500mg", dosage: "1 capsule", frequency: "Twice a day" },
                ],
            },
            {
                id: `pr_${crypto.randomBytes(8).toString("hex")}`,
                doctorName: "Dr. Priya Sharma",
                hospitalName: "Jan Aushadhi Kendra - Sector 12",
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 days ago
                medicines: [
                    {
                        name: "Atorvastatin 10mg",
                        dosage: "1 tablet",
                        frequency: "Once daily at night",
                    },
                    {
                        name: "Metformin 500mg",
                        dosage: "1 tablet",
                        frequency: "Twice a day after meals",
                    },
                ],
            },
        ];
    },
};

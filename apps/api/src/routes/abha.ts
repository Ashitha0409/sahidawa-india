import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { abhaService } from "../services/abha-service";
import { supabase } from "../db/client";
import { encrypt, decrypt } from "../utils/crypto";
import logger from "../utils/logger";
import { abhaLimiter } from "../middleware/rateLimit";

const router = Router();
router.use(abhaLimiter);

/**
 * GET /api/v1/abha/status
 * Check if the user's account is currently linked to an ABHA ID.
 */
router.get(
    "/status",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { data: link, error } = await supabase
                .from("abha_links")
                .select("id, abha_address, abha_number, is_active, linked_at, last_synced_at")
                .eq("user_id", userId)
                .eq("is_active", true)
                .maybeSingle();

            if (error) {
                logger.error("Error fetching ABHA link status", { userId, error: error.message });
                res.status(500).json({ error: "Failed to fetch ABHA status" });
                return;
            }

            res.status(200).json({
                linked: !!link,
                link: link || null,
            });
        } catch (error: any) {
            logger.error("Error in ABHA status route", { error: error.message });
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

/**
 * POST /api/v1/abha/link
 * Initiate ABHA linkage by generating a mock/real OTP transaction.
 */
router.post(
    "/link",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { abha_address } = req.body;
            if (!abha_address || typeof abha_address !== "string") {
                res.status(400).json({ error: "abha_address is required" });
                return;
            }

            const { txnId } = await abhaService.generateOTP(abha_address);
            res.status(200).json({ txn_id: txnId });
        } catch (error: any) {
            logger.error("Error initiating ABHA link", { error: error.message });
            res.status(500).json({ error: error.message || "Failed to generate ABHA OTP" });
        }
    }
);

/**
 * POST /api/v1/abha/verify-otp
 * Complete the link by verifying OTP and saving encrypted tokens.
 */
router.post(
    "/verify-otp",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { txn_id, otp } = req.body;

            if (!txn_id || !otp) {
                res.status(400).json({ error: "txn_id and otp are required" });
                return;
            }

            // Verify with service
            const { token, abhaNumber, abhaAddress } = await abhaService.verifyOTP(txn_id, otp);

            // Encrypt the token using a user-specific derived key
            const encryptedToken = encrypt(token, userId);

            // Upsert into abha_links database table
            const { data: link, error } = await supabase
                .from("abha_links")
                .upsert(
                    {
                        user_id: userId,
                        abha_address: abhaAddress,
                        abha_number: abhaNumber,
                        encrypted_token: encryptedToken,
                        is_active: true,
                        linked_at: new Date().toISOString(),
                        last_synced_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                )
                .select()
                .single();

            if (error) {
                logger.error("Failed to persist ABHA link to database", {
                    userId,
                    error: error.message,
                });
                res.status(500).json({ error: "Failed to persist link to database" });
                return;
            }

            res.status(200).json({
                success: true,
                message: "ABHA ID successfully linked",
                abha_address: abhaAddress,
                abha_number: abhaNumber,
            });
        } catch (error: any) {
            logger.error("Error verifying ABHA OTP", { error: error.message });
            res.status(400).json({ error: error.message || "Failed to verify OTP" });
        }
    }
);

/**
 * POST /api/v1/abha/upload-verification
 * Push a verified medicine scan result to ABHA records.
 */
router.post(
    "/upload-verification",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { medicine_id, verification_result, scanned_at } = req.body;

            if (!medicine_id || !verification_result || !scanned_at) {
                res.status(400).json({
                    error: "medicine_id, verification_result, and scanned_at are required",
                });
                return;
            }

            // 1. Retrieve the active link
            const { data: link, error: linkErr } = await supabase
                .from("abha_links")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .maybeSingle();

            if (linkErr || !link) {
                res.status(400).json({ error: "No active ABHA account linked for this user" });
                return;
            }

            // 2. Decrypt the token
            const decryptedToken = decrypt(link.encrypted_token, userId);

            // 3. Prepare document and upload to service
            const documentPayload = {
                documentType: "verification",
                documentContent: Buffer.from(
                    JSON.stringify({ medicine_id, verification_result, scanned_at })
                ).toString("base64"),
                fileName: `verification-${medicine_id}-${Date.now()}.json`,
            };

            const uploadSuccess = await abhaService.uploadDocument(decryptedToken, documentPayload);
            if (!uploadSuccess) {
                res.status(500).json({ error: "Failed to upload document to ABHA gateway" });
                return;
            }

            // 4. Save record locally to abha_records
            const { error: recordErr } = await supabase.from("abha_records").insert({
                user_id: userId,
                abha_link_id: link.id,
                record_type: "verification",
                record_data: {
                    medicine_id,
                    verification_result,
                    scanned_at,
                },
                synced_at: new Date().toISOString(),
            });

            if (recordErr) {
                logger.error("Failed to save local ABHA record", {
                    userId,
                    error: recordErr.message,
                });
                res.status(500).json({ error: "Failed to persist local record after upload" });
                return;
            }

            res.status(200).json({ success: true, message: "Verification result saved to ABHA" });
        } catch (error: any) {
            logger.error("Error uploading medicine verification to ABHA", { error: error.message });
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

/**
 * GET /api/v1/abha/prescriptions
 * Fetch prescriptions from the linked ABHA account.
 */
router.get(
    "/prescriptions",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;

            // 1. Get user link
            const { data: link, error: linkErr } = await supabase
                .from("abha_links")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .maybeSingle();

            if (linkErr || !link) {
                res.status(400).json({ error: "No active ABHA account linked for this user" });
                return;
            }

            // 2. Decrypt token
            const decryptedToken = decrypt(link.encrypted_token, userId);

            // 3. Retrieve from gateway service
            const prescriptions = await abhaService.getPrescriptions(decryptedToken);

            // 4. Sync new records in the database
            const { data: existingRecords } = await supabase
                .from("abha_records")
                .select("record_data")
                .eq("user_id", userId)
                .eq("record_type", "prescription");

            const existingIds = new Set(
                existingRecords?.map((r) => (r.record_data as any)?.id) || []
            );

            const newPrescriptions = prescriptions.filter((p) => !existingIds.has(p.id));
            if (newPrescriptions.length > 0) {
                const { error: insertErr } = await supabase.from("abha_records").insert(
                    newPrescriptions.map((p) => ({
                        user_id: userId,
                        abha_link_id: link.id,
                        record_type: "prescription",
                        record_data: p,
                        synced_at: new Date().toISOString(),
                    }))
                );

                if (insertErr) {
                    logger.error("Failed to sync new prescriptions to database", {
                        userId,
                        error: insertErr.message,
                    });
                }
            }

            // Update last synced at
            await supabase
                .from("abha_links")
                .update({ last_synced_at: new Date().toISOString() })
                .eq("id", link.id);

            // Return the fetched prescriptions list
            res.status(200).json(prescriptions);
        } catch (error: any) {
            logger.error("Error fetching prescriptions from ABHA", { error: error.message });
            res.status(500).json({ error: error.message || "Failed to fetch prescriptions" });
        }
    }
);

/**
 * GET /api/v1/abha/records
 * Retrieve the timeline of all stored local ABHA records (prescriptions and scan verifications).
 */
router.get(
    "/records",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { data: records, error } = await supabase
                .from("abha_records")
                .select("*")
                .eq("user_id", userId)
                .order("synced_at", { ascending: false });

            if (error) {
                logger.error("Error fetching local ABHA records", { userId, error: error.message });
                res.status(500).json({ error: "Failed to fetch local records" });
                return;
            }

            res.status(200).json(records);
        } catch (error: any) {
            logger.error("Error in GET /records", { error: error.message });
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

/**
 * DELETE /api/v1/abha/unlink
 * Unlinks the user's ABHA account and deletes stored credentials and history.
 */
router.delete(
    "/unlink",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;

            // Deleting from abha_links will cascade delete rows in abha_records
            const { error } = await supabase.from("abha_links").delete().eq("user_id", userId);

            if (error) {
                logger.error("Failed to delete ABHA link from database", {
                    userId,
                    error: error.message,
                });
                res.status(500).json({ error: "Failed to unlink account" });
                return;
            }

            res.status(200).json({ success: true, message: "ABHA account successfully unlinked" });
        } catch (error: any) {
            logger.error("Error unlinking ABHA account", { error: error.message });
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

export default router;

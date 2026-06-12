import { Router } from "express";
import { z } from "zod";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../db/client";
import logger from "../utils/logger";

const router = Router();

const trackSchema = z.object({
    medicine_id: z.string(),
    medicine_name: z.string(),
    batch_number: z.string().optional().nullable(),
    expiry_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
    session_id: z.string().optional().nullable(),
});

/**
 * POST /api/v1/medicines/track
 * Save a medicine with batch number and expiry date
 */
router.post("/track", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const parseResult = trackSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: "Invalid payload schema",
                details: parseResult.error.issues,
            });
            return;
        }

        const {
            medicine_id,
            medicine_name,
            batch_number,
            expiry_date,
            session_id: bodySessionId,
        } = parseResult.data;

        const user_id = req.user?.id || null;
        const session_id = user_id
            ? null
            : (req.headers["x-session-id"] as string) || bodySessionId || null;

        if (!user_id && !session_id) {
            res.status(400).json({
                error: "Either user must be authenticated or x-session-id/session_id must be provided",
            });
            return;
        }

        const { data, error } = await supabase
            .from("tracked_medicines")
            .insert({
                user_id,
                session_id,
                medicine_id,
                medicine_name,
                batch_number,
                expiry_date,
            })
            .select()
            .single();

        if (error) {
            logger.error("Error inserting tracked medicine", { error });
            res.status(500).json({ error: "Failed to track medicine" });
            return;
        }

        res.status(201).json({ success: true, data });
    } catch (err) {
        logger.error("Unexpected error in POST /api/v1/medicines/track", { error: err });
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * GET /api/v1/medicines/tracked
 * List user's tracked medicines
 */
router.get("/tracked", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const user_id = req.user?.id || null;
        const session_id = user_id
            ? null
            : (req.headers["x-session-id"] as string) || (req.query.session_id as string) || null;

        if (!user_id && !session_id) {
            res.status(400).json({
                error: "Either user must be authenticated or x-session-id/session_id must be provided",
            });
            return;
        }

        let query = supabase.from("tracked_medicines").select("*");
        if (user_id) {
            query = query.eq("user_id", user_id);
        } else {
            query = query.eq("session_id", session_id);
        }

        const { data, error } = await query.order("expiry_date", { ascending: true });

        if (error) {
            logger.error("Error fetching tracked medicines", { error });
            res.status(500).json({ error: "Failed to fetch tracked medicines" });
            return;
        }

        res.json(data || []);
    } catch (err) {
        logger.error("Unexpected error in GET /api/v1/medicines/tracked", { error: err });
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * DELETE /api/v1/medicines/track/:id
 * Remove a tracked medicine
 */
router.delete("/track/:id", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id || null;
        const session_id = user_id
            ? null
            : (req.headers["x-session-id"] as string) || (req.query.session_id as string) || null;

        if (!user_id && !session_id) {
            res.status(400).json({
                error: "Either user must be authenticated or x-session-id/session_id must be provided",
            });
            return;
        }

        // Make sure user owns the entry
        let checkQuery = supabase.from("tracked_medicines").select("id").eq("id", id);
        if (user_id) {
            checkQuery = checkQuery.eq("user_id", user_id);
        } else {
            checkQuery = checkQuery.eq("session_id", session_id);
        }

        const { data: existing, error: checkError } = await checkQuery;
        if (checkError) {
            logger.error("Error checking ownership for delete", { error: checkError });
            res.status(500).json({ error: "Failed to delete tracked medicine" });
            return;
        }

        if (!existing || existing.length === 0) {
            res.status(404).json({ error: "Tracked medicine not found or unauthorized" });
            return;
        }

        const { error: deleteError } = await supabase
            .from("tracked_medicines")
            .delete()
            .eq("id", id);

        if (deleteError) {
            logger.error("Error deleting tracked medicine", { error: deleteError });
            res.status(500).json({ error: "Failed to delete tracked medicine" });
            return;
        }

        res.status(200).json({ success: true, message: "Tracked medicine deleted" });
    } catch (err) {
        logger.error("Unexpected error in DELETE /api/v1/medicines/track/:id", { error: err });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

import { supabase } from "../db/client";
import { sendExpiryReminder } from "../services/notifications";
import logger from "../utils/logger";

/**
 * Runs the medicine expiry check, querying medicines expiring in <= 30 days,
 * notifying users, and updating database flags.
 */
export async function runExpiryCheck() {
    logger.info("Starting daily medicine expiry check...");

    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // Format to YYYY-MM-DD
        const maxExpiryStr = thirtyDaysFromNow.toISOString().split("T")[0];

        // Fetch all tracked medicines expiring within 30 days
        const { data: medicines, error } = await supabase
            .from("tracked_medicines")
            .select("*")
            .lte("expiry_date", maxExpiryStr);

        if (error) {
            logger.error("Error fetching expiring medicines in cron job", { error });
            return;
        }

        if (!medicines || medicines.length === 0) {
            logger.info("No expiring medicines found within 30 days.");
            return;
        }

        logger.info(
            `Found ${medicines.length} medicine(s) expiring within 30 days. Processing notifications...`
        );

        for (const med of medicines) {
            // Only send push notifications if there is an authenticated user associated
            if (!med.user_id) continue;

            const expiryDate = new Date(med.expiry_date);
            const diffTime = expiryDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let shouldNotify = false;
            const updateFields: Record<string, boolean> = {};

            if (daysRemaining <= 7) {
                if (!med.notified_7d) {
                    shouldNotify = true;
                    updateFields.notified_7d = true;
                    updateFields.notified_14d = true;
                    updateFields.notified_30d = true;
                }
            } else if (daysRemaining <= 14) {
                if (!med.notified_14d) {
                    shouldNotify = true;
                    updateFields.notified_14d = true;
                    updateFields.notified_30d = true;
                }
            } else if (daysRemaining <= 30) {
                if (!med.notified_30d) {
                    shouldNotify = true;
                    updateFields.notified_30d = true;
                }
            }

            if (shouldNotify) {
                try {
                    logger.info(
                        `Sending expiry reminder: ${med.medicine_name} to user ${med.user_id} (${daysRemaining} days remaining)`
                    );
                    const result = await sendExpiryReminder(
                        med.user_id,
                        med.medicine_name,
                        daysRemaining,
                        med.batch_number
                    );

                    // Update flags in database even if no push subscription was found to prevent duplicate checks
                    const { error: updateError } = await supabase
                        .from("tracked_medicines")
                        .update(updateFields)
                        .eq("id", med.id);

                    if (updateError) {
                        logger.error(
                            `Failed to update notification flags for medicine ID ${med.id}`,
                            { error: updateError }
                        );
                    }
                } catch (notifyErr) {
                    logger.error(`Error sending notification/updating medicine ID ${med.id}`, {
                        error: notifyErr,
                    });
                }
            }
        }

        logger.info("Daily medicine expiry check completed.");
    } catch (err) {
        logger.error("Unexpected error in runExpiryCheck", { error: err });
    }
}

/**
 * Starts the daily checker timer
 */
export function startExpiryCron() {
    logger.info("Initializing daily medicine expiry checker timer...");
    // Run immediately on start
    runExpiryCheck().catch((err) =>
        logger.error("Initial run of runExpiryCheck failed", { error: err })
    );

    // Run every 24 hours (86400000 ms)
    setInterval(
        () => {
            logger.info("Executing scheduled medicine expiry check...");
            runExpiryCheck().catch((err) =>
                logger.error("Scheduled run of runExpiryCheck failed", { error: err })
            );
        },
        24 * 60 * 60 * 1000
    );
}

import crypto from "crypto";

/**
 * Derives a user-specific 256-bit encryption key using PBKDF2.
 * Uses the user's UUID as the salt.
 */
export function getUserEncryptionKey(userId: string): Buffer {
    const masterKey =
        process.env.ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        "dev_jwt_secret_change_in_production";
    // PBKDF2 key derivation: 10,000 iterations, 32 bytes (256 bits) output, sha256
    return crypto.pbkdf2Sync(masterKey, userId, 10000, 32, "sha256");
}

/**
 * Encrypts cleartext using AES-256-CBC with a user-specific derived key.
 * Returns the format `ivHex:encryptedHex`.
 */
export function encrypt(text: string, userId: string): string {
    const key = getUserEncryptionKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a ciphertext encrypted via the user-specific key.
 */
export function decrypt(encryptedData: string, userId: string): string {
    const key = getUserEncryptionKey(userId);
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
    }

    const [ivHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

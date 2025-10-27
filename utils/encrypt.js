const promptSync = require('prompt-sync');

/**
 * Derives a key from a password using PBKDF2.
 * @param {string} password - The password to derive the key from.
 * @param {ArrayBuffer} salt - The salt for key derivation.
 * @returns {Promise<CryptoKey>} - The derived key.
 */
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password);
    const importedKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        importedKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a string using a password.
 * @param {string} text - The text to encrypt.
 * @param {string} password - The password to use for encryption.
 * @returns {Promise<string>} - The encrypted data as a base64 string (salt:iv:ciphertext).
 */
async function encryptString(text, password) {
    try {
        const enc = new TextEncoder();
        const data = enc.encode(text);

        // Generate a random salt and IV (Initialization Vector)
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Derive the key from the password
        const key = await deriveKey(password, salt);

        // Encrypt the data
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );

        // Convert buffers to base64 for storage/transmission
        const saltBase64 = Buffer.from(salt).toString('base64');
        const ivBase64 = Buffer.from(iv).toString('base64');
        const encryptedBase64 = Buffer.from(new Uint8Array(encrypted)).toString('base64');

        // Combine salt, iv, and ciphertext with a delimiter
        return `${saltBase64}:${ivBase64}:${encryptedBase64}`;
    } catch (error) {
        console.error("Encryption error:", error);
        throw new Error("Failed to encrypt the string.");
    }
}

/**
 * Decrypts a string using a password.
 * @param {string} encryptedData - The encrypted data as a base64 string (salt:iv:ciphertext).
 * @param {string} password - The password to use for decryption.
 * @returns {Promise<string>} - The decrypted text.
 */
async function decryptString(encryptedData, password) {
    try {
        const dec = new TextDecoder();
        // Split the input string into salt, iv, and ciphertext
        const [saltBase64, ivBase64, encryptedBase64] = encryptedData.split(":");

        // Convert base64 strings back to buffers
        const salt = new Uint8Array(Buffer.from(saltBase64, 'base64'));
        const iv = new Uint8Array(Buffer.from(ivBase64, 'base64'));
        const encrypted = new Uint8Array(Buffer.from(encryptedBase64, 'base64'));

        // Derive the key from the password
        const key = await deriveKey(password, salt);

        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encrypted
        );

        return dec.decode(decrypted);
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Failed to decrypt the string. Ensure the password is correct.");
    }
}

const getHiddenInput = (prompt) => {
    return promptSync({sigint: true})(prompt, {echo: '*'});
}

module.exports = {
    encryptString,
    decryptString,
    getHiddenInput
}
// OTP scaffolding for MVP (no SMS provider integration here).
// Backend should store OTP hashes in `otp_requests` and mark verified=true.
export function generateOtpCode() {
    // 6-digit numeric OTP
    const code = Math.floor(Math.random() * 1_000_000);
    return code.toString().padStart(6, "0");
}
// MVP placeholder hashing.
// In production use a strong hash like bcrypt/argon2.
export function otpHash(otpCode) {
    // Not secure; for MVP placeholder only.
    let h = 0;
    for (let i = 0; i < otpCode.length; i++) {
        h = (h * 31 + otpCode.charCodeAt(i)) >>> 0;
    }
    return `mvp_hash_${h}`;
}
export function verifyOtp(input) {
    const now = Date.now();
    if (input.otpRow.isVerified)
        return { ok: false, reason: "already_verified" };
    if (now > input.otpRow.expiresAtMs)
        return { ok: false, reason: "expired" };
    if (input.otpRow.attemptsUsed >= input.otpRow.maxAttempts) {
        return { ok: false, reason: "too_many_attempts" };
    }
    const givenHash = otpHash(input.otpCode);
    if (givenHash !== input.otpRow.otpHash)
        return { ok: false, reason: "invalid_otp" };
    return { ok: true };
}

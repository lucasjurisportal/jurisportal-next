export const OTP_CODE_LENGTH = 5;
export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const TRUSTED_DEVICE_DAYS = 15;

/**
 * Sem 0/O e 1/I para reduzir erro visual na digitação.
 * 32 caracteres => 32^5 = 33.554.432 combinações possíveis.
 */
export const OTP_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export type SecurityChallengePurpose =
  | "EMAIL_VERIFICATION"
  | "LOGIN_2FA"
  | "ACCOUNT_RECOVERY";

export type OtpDeliveryChannel = "email" | "sms";

export const TRUSTED_DEVICE_COOKIE = "jp_trusted_device";

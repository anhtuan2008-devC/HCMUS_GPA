import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";

type NullableSecretValue = string | number | null | undefined;

const DEV_HASH_PEPPER = "hcmus-gpa-development-hash-pepper";
const DEV_ENCRYPTION_KEY = "hcmus-gpa-development-encryption-key";

function requiredServerSecret(name: "DATA_HASH_PEPPER" | "DATA_ENCRYPTION_KEY", devFallback: string) {
  const value = process.env[name];

  if (value && value.trim()) {
    return value.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing server-only privacy secret: ${name}`);
  }

  return devFallback;
}

function normalizeBlindIndexValue(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function encryptionKey() {
  return createHash("sha256")
    .update(requiredServerSecret("DATA_ENCRYPTION_KEY", DEV_ENCRYPTION_KEY))
    .digest();
}

export function assertPrivacySecretsConfigured() {
  requiredServerSecret("DATA_HASH_PEPPER", DEV_HASH_PEPPER);
  requiredServerSecret("DATA_ENCRYPTION_KEY", DEV_ENCRYPTION_KEY);
}

function toStableNumberText(value: NullableSecretValue, digits: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(digits);
}

export function privacyHash(value: string, scope: string) {
  return createHmac("sha256", requiredServerSecret("DATA_HASH_PEPPER", DEV_HASH_PEPPER))
    .update(scope)
    .update("\0")
    .update(normalizeBlindIndexValue(value))
    .digest("hex");
}

export function encryptSensitiveValue(value: NullableSecretValue, scope: string) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);

  cipher.setAAD(Buffer.from(scope));

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function createProfilePrivacyFields(input: {
  email: string;
  studentCode: string;
}) {
  const email = input.email.trim();
  const studentCode = input.studentCode.trim();

  return {
    emailHash: privacyHash(email, "student_profiles.email"),
    studentCodeHash: privacyHash(studentCode, "student_profiles.student_code"),
    emailEncrypted: encryptSensitiveValue(email, "student_profiles.email"),
    studentCodeEncrypted: encryptSensitiveValue(studentCode, "student_profiles.student_code"),
  };
}

export function createAttemptPrivacyFields(input: {
  score10?: number | null;
  score4?: number | null;
  status: string;
  gradeInputMode: string;
}) {
  const score10Text = toStableNumberText(input.score10, 3);
  const score4Text = toStableNumberText(input.score4, 2);
  const scoreFingerprint = [
    score10Text ?? "null",
    score4Text ?? "null",
    input.status,
    input.gradeInputMode,
  ].join("|");

  return {
    score10Encrypted: encryptSensitiveValue(score10Text, "student_course_attempts.score10"),
    score4Encrypted: encryptSensitiveValue(score4Text, "student_course_attempts.score4"),
    scoreHash: privacyHash(scoreFingerprint, "student_course_attempts.score"),
  };
}

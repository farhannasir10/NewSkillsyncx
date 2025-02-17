import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashedStoredPassword, salt] = stored.split(".");
    if (!hashedStoredPassword || !salt) {
      console.error("Invalid stored password format");
      return false;
    }

    const hashedSuppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const hashedStoredBuf = Buffer.from(hashedStoredPassword, "hex");

    return timingSafeEqual(hashedSuppliedBuf, hashedStoredBuf);
  } catch (error) {
    console.error("Password comparison failed:", error);
    return false;
  }
}
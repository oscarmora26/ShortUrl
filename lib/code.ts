import { randomInt } from "node:crypto";

/**
 * S1: codes are 7 characters from `[0-9A-Za-z]`, drawn with the platform CSPRNG
 * (`randomInt` is unbiased) and never a reserved word.
 */
export const CODE_LENGTH = 7;

export const CODE_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const RESERVED_CODES = [
  "admin",
  "login",
  "api",
  "go",
  "links",
  "_next",
  "favicon.ico",
  "health",
  "stats",
] as const;

const reserved = new Set<string>(RESERVED_CODES.map((code) => code.toLowerCase()));

export function isReservedCode(code: string): boolean {
  return reserved.has(code.toLowerCase());
}

export function generateCode(length: number = CODE_LENGTH): string {
  for (;;) {
    let code = "";
    for (let index = 0; index < length; index += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    if (!isReservedCode(code)) {
      return code;
    }
  }
}

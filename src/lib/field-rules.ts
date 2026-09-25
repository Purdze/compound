import { z } from "zod";

// Shared by API validation and form inputs, so this file must stay client-safe.

export const MIN_PASSWORD_LENGTH = 10;
export const NAME_MAX_LENGTH = 60;

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(1024, "That password is too long.");

export const nameSchema = (emptyMessage: string) =>
  z.string().trim().min(1, emptyMessage).max(NAME_MAX_LENGTH, `Keep it under ${NAME_MAX_LENGTH} characters.`);

export const ownerNameSchema = nameSchema("Enter a name.");

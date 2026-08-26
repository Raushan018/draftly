import { Prisma } from "@prisma/client";

/**
 * Logs the real error server-side and returns a safe, human-readable message.
 * Never forwards raw database/driver error text to the client.
 */
export function toFriendlyError(error: unknown, fallback: string): string {
  console.error(error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "That already exists.";
      case "P2003":
        return "That user or document no longer exists.";
      case "P2025":
        return "That record no longer exists.";
      default:
        return fallback;
    }
  }

  return fallback;
}

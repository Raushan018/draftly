import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const USER_COOKIE = "draftly_user_id";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE)?.value;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }

  const fallback = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!fallback) {
    throw new Error("No seeded users found. Run `npm run db:seed`.");
  }
  return fallback;
}

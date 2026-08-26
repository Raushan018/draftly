"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE } from "@/lib/session";

export async function switchUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (error) {
    console.error(error);
    return;
  }

  if (!user) return;

  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/documents");
}

import { prisma } from "../prisma";

export function getBootstrapAdminEmail() {
  return (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

export function isBootstrapAdminEmail(email) {
  const admin = getBootstrapAdminEmail();
  if (!admin || !email) return false;
  return String(email).trim().toLowerCase() === admin;
}

/**
 * Upsert AppUser from Supabase auth claims.
 * Bootstrap ADMIN_EMAIL is always kept as admin.
 */
export async function ensureAppUser({ supabaseUserId, email, fullName }) {
  if (!supabaseUserId) throw new Error("Missing supabaseUserId");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Missing email");

  const bootstrapAdmin = isBootstrapAdminEmail(normalizedEmail);
  const existing = await prisma.appUser.findUnique({ where: { supabaseUserId } });

  if (!existing) {
    return prisma.appUser.create({
      data: {
        supabaseUserId,
        email: normalizedEmail,
        fullName: fullName || null,
        role: bootstrapAdmin ? "admin" : "user",
      },
    });
  }

  return prisma.appUser.update({
    where: { id: existing.id },
    data: {
      email: normalizedEmail,
      fullName: fullName || existing.fullName,
      ...(bootstrapAdmin ? { role: "admin" } : {}),
    },
  });
}

export function serializeAppUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isAdmin: user.role === "admin",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listAppUsers() {
  const users = await prisma.appUser.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(serializeAppUser);
}

export async function setAppUserRole({ actor, targetUserId, role }) {
  if (!actor?.isAdmin && actor?.role !== "admin") {
    const err = new Error("Only admins can change roles");
    err.statusCode = 403;
    throw err;
  }
  if (!["user", "admin"].includes(role)) {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  const target = await prisma.appUser.findUnique({ where: { id: targetUserId } });
  if (!target) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "user" && isBootstrapAdminEmail(target.email)) {
    const err = new Error("Cannot demote the bootstrap admin account");
    err.statusCode = 400;
    throw err;
  }

  if (role === "user" && target.role === "admin") {
    const adminCount = await prisma.appUser.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      const err = new Error("Cannot remove the last admin");
      err.statusCode = 400;
      throw err;
    }
  }

  const updated = await prisma.appUser.update({
    where: { id: targetUserId },
    data: { role },
  });
  return serializeAppUser(updated);
}

/** Prisma where fragment: admins see all; users only their rows. */
export function ownerScopeWhere(appUser, field = "ownerUserId") {
  if (!appUser) return { id: "__none__" };
  if (appUser.role === "admin") return {};
  return { [field]: appUser.id };
}

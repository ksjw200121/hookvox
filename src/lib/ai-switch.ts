import { prisma } from "@/lib/prisma";

export async function isAiEnabled(): Promise<boolean> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "ai_enabled" },
  });

  if (!setting) return true;

  return setting.value === "true";
}

export async function setAiEnabled(enabled: boolean) {
  const existing = await prisma.systemSettings.findUnique({
    where: { key: "ai_enabled" },
  });

  if (existing) {
    await prisma.systemSettings.update({
      where: { key: "ai_enabled" },
      data: { value: enabled ? "true" : "false" },
    });
  } else {
    await prisma.systemSettings.create({
      data: {
        key: "ai_enabled",
        value: enabled ? "true" : "false",
      },
    });
  }
}
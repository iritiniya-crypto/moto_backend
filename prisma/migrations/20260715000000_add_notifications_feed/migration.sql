CREATE TYPE "NotificationRecipientRole" AS ENUM ('instructor', 'student');
CREATE TYPE "NotificationChannel" AS ENUM ('internal', 'telegram');
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed', 'read');

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipientRole" "NotificationRecipientRole" NOT NULL,
  "recipientTelegramChatId" TEXT,
  "studentId" TEXT,
  "bookingSlotId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'internal',
  "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientRole_createdAt_idx" ON "Notification"("recipientRole", "createdAt");
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");
CREATE INDEX "Notification_type_bookingSlotId_recipientRole_idx" ON "Notification"("type", "bookingSlotId", "recipientRole");

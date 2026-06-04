CREATE TABLE "Instructor" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "telegramUsername" TEXT NOT NULL,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Instructor_telegramUsername_key" ON "Instructor"("telegramUsername");
CREATE UNIQUE INDEX "Instructor_userId_key" ON "Instructor"("userId");
CREATE INDEX "Instructor_lastName_firstName_idx" ON "Instructor"("lastName", "firstName");

INSERT INTO "Instructor" ("id", "firstName", "lastName", "telegramUsername", "createdAt", "updatedAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Никита',
  'Александров',
  'Nikita_Alex_Vietnam',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

ALTER TABLE "Student"
ADD COLUMN "instructorId" TEXT NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111';

CREATE INDEX "Student_instructorId_idx" ON "Student"("instructorId");

ALTER TABLE "Instructor"
ADD CONSTRAINT "Instructor_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Student"
ADD CONSTRAINT "Student_instructorId_fkey"
FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "TrainingPackage"
ADD COLUMN "name" TEXT;

UPDATE "TrainingPackage"
SET "name" = CASE "type"
  WHEN 'scooter' THEN 'Скутер'
  WHEN 'gymkhana' THEN 'Джимхана'
  ELSE 'Мотоцикл'
END
WHERE "name" IS NULL;

ALTER TABLE "TrainingPackage"
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Мотоцикл';

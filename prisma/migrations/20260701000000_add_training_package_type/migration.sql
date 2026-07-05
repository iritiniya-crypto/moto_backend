CREATE TYPE "TrainingPackageType" AS ENUM ('scooter', 'motorcycle', 'gymkhana');

ALTER TABLE "TrainingPackage"
ADD COLUMN "type" "TrainingPackageType" NOT NULL DEFAULT 'motorcycle';

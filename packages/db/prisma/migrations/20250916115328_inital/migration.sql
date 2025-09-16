-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "availableBalance" TEXT NOT NULL DEFAULT '0',
    "lockedBalance" TEXT NOT NULL DEFAULT '0',
    "totalBalance" TEXT NOT NULL DEFAULT '0',
    "decimals" INTEGER NOT NULL DEFAULT 6,
    "lastLoggedIn" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

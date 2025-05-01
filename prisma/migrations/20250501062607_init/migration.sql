-- CreateTable
CREATE TABLE "User" (
    "identifier" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "lock_until" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("identifier")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attemptTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("identifier") ON DELETE RESTRICT ON UPDATE CASCADE;

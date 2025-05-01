-- CreateTable
CREATE TABLE "users" (
    "identifier" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "lock_until" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("identifier")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attemptTime" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("identifier") ON DELETE RESTRICT ON UPDATE CASCADE;

I am building a login system for users in India, where the preferred timezone is IST (Indian Standard Time, UTC+5:30). However, when I check the database using Prisma (e.g., through prisma.studio or logs), I notice that the timestamps (such as attemptTime or lock_until) are being stored in UTC rather than IST.

For example:

1)Actual local time (in India): 3:24 PM IST
2)Stored time in DB (in UTC): 09:54 AM

=>While Prisma stores the timestamps in UTC by default, I still want to ensure that the account lock time is correctly handled in IST. In this case, if an account is locked due to multiple failed login attempts, it will remain locked for 24 hours from the time of the first failed attempt. The account will be unlocked exactly 24 hours later in IST, even though the stored time is in UTC.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Extensions
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'PAYMENT', 'PROPERTY');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KINDE', 'NATIVE');

-- CreateEnum
CREATE TYPE "GBCProfession" AS ENUM ('SURVEYOR', 'GIS_ANALYST', 'URBAN_PLANNER', 'LAWYER', 'ENGINEER', 'ARCHITECT', 'DATA_SCIENTIST', 'DEVELOPER', 'PROJECT_MANAGER', 'STUDENT', 'RESEARCHER', 'ENTREPRENEUR', 'GOVERNMENT_OFFICIAL', 'NGO_STAFF', 'CONSULTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "GBCRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "GBCGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "GBCTicketType" AS ENUM ('EARLY_BIRD', 'REGULAR', 'COMPANY', 'VIP', 'STUDENT');

-- CreateEnum
CREATE TYPE "GBCPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GBCEditionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'PAST');

-- CreateEnum
CREATE TYPE "GBCMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "GBCSpeakerTier" AS ENUM ('KEYNOTE', 'PANELIST', 'FIRESIDE_CHAT');

-- CreateEnum
CREATE TYPE "GBCInquiryStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GBCNotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "GBCNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "GBCUserNotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GBCUserNotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "SurfboardRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN', 'RECORDS_I', 'INTAKE', 'RECORDS_II', 'ACCOUNTS', 'CHARTING', 'SURCON', 'MDA_SUPERADMIN', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "PayerIDType" AS ENUM ('Individual', 'Commercial');

-- CreateEnum
CREATE TYPE "SurfboardPlanStatus" AS ENUM ('PENDING', 'LODGED', 'QUERIED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "SurfboardRedCopyStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'COMPLETED', 'FAILED', 'APPROVED', 'QUERIED');

-- CreateEnum
CREATE TYPE "SurfboardNotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'PLAN', 'SHARING');

-- CreateEnum
CREATE TYPE "SurfboardNotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'QUERIED');

-- CreateEnum
CREATE TYPE "BatchPaymentStatus" AS ENUM ('PENDING_USER_PAYMENT', 'LASG_PAID', 'ACCOUNTS_APPROVED', 'ACCOUNTS_DISAPPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QRServiceType" AS ENUM ('LOCATION_AUTHENTICITY', 'CERTIFICATE_OF_DEPOSIT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "NotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "invitedByName" TEXT NOT NULL,
    "invitedByEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'OTP',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "entityKey" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_editions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "subTheme" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "GBCEditionStatus" NOT NULL,
    "ticketPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gbc_editions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GBCUser" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "role" "GBCRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GBCUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "gender" "GBCGender" NOT NULL,
    "profession" TEXT NOT NULL DEFAULT '',
    "ticketType" "GBCTicketType" NOT NULL,
    "price" INTEGER NOT NULL,
    "paymentStatus" "GBCPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentDetails" JSONB,
    "qrCode" TEXT,
    "qrCodeS3Key" TEXT,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "certificateSentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "logoS3Key" TEXT,
    "tier" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_sponsor_tiers" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" TEXT NOT NULL DEFAULT 'STANDARD',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_sponsor_tiers_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "gbc_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "logoS3Key" TEXT,
    "description" TEXT,
    "website" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_gallery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" "GBCMediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaS3Key" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailS3Key" TEXT,
    "year" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_speakers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "photoS3Key" TEXT,
    "tier" "GBCSpeakerTier" NOT NULL,
    "company" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_settings" (
    "id" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "previousSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_contact_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT,
    "status" "GBCInquiryStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_event_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "checkedIn" INTEGER NOT NULL DEFAULT 0,
    "newInquiries" INTEGER NOT NULL DEFAULT 0,
    "websiteVisits" INTEGER NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "smsSent" INTEGER NOT NULL DEFAULT 0,
    "edition" TEXT NOT NULL DEFAULT '2.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_event_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_notifications" (
    "id" TEXT NOT NULL,
    "type" "GBCNotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "GBCNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbc_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_user_notifications" (
    "id" TEXT NOT NULL,
    "type" "GBCUserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "GBCUserNotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbc_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbc_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nigeria_ward_admin_boundaries" (
    "id" SERIAL NOT NULL,
    "geom" geometry,
    "wardname" VARCHAR(112),
    "lganame" VARCHAR(44),
    "statename" VARCHAR(22),
    "Shape_Leng" DOUBLE PRECISION,
    "Shape_Area" DOUBLE PRECISION,
    "lcdaname" VARCHAR(254),

    CONSTRAINT "nigeria_ward_admin_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scale_of_fees" (
    "id" SERIAL NOT NULL,
    "geom" geometry,
    "Name" VARCHAR(254),
    "Zone" VARCHAR(50),

    CONSTRAINT "Scale_of_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LASG_charting_interpretation" (
    "id" SERIAL NOT NULL,
    "geom" geometry,
    "interpretation" TEXT,

    CONSTRAINT "LASG_charting_interpretation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    "references" TEXT[],
    "title" TEXT,
    "description" TEXT,
    "status" TEXT,
    "paymentStatus" TEXT,
    "paymentLink" TEXT,
    "statusMessage" TEXT,
    "error" TEXT,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "lga" TEXT NOT NULL,
    "parcelId" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "documentsUrls" TEXT[],
    "site_images" TEXT[],
    "comments" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "report" JSONB,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeUserProperty" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    "requester" TEXT,
    "description" TEXT,
    "status" TEXT,
    "paymentStatus" TEXT,
    "statusMessage" TEXT,
    "error" TEXT,
    "email" TEXT NOT NULL,
    "userPhoneNumber" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "lga" TEXT NOT NULL,
    "parcelId" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "documentsUrls" TEXT[],
    "site_images" TEXT[],
    "comments" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "report" JSONB,

    CONSTRAINT "OneTimeUserProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadOtp" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevaUser" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedVia" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevaUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reva_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reva_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reva_settings" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "reva_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfboardUser" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "SurfboardRole" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedVia" TEXT,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isKycValidated" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
    "logo" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "surconRegNumber" TEXT DEFAULT concat('SURCON_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 5)),
    "surconRegName" TEXT,
    "signature" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "residenceState" TEXT,
    "postalCode" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "payerID" INTEGER,
    "payerIDType" "PayerIDType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "SurfboardUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "email" TEXT,
    "customerCode" TEXT,
    "customerId" TEXT,
    "emailToken" TEXT,
    "authorization" TEXT,
    "subCode" TEXT,
    "planCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "currentStart" TIMESTAMP(3),
    "currentEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'surfboard',
    "expiryReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "lastPaymentDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfboardPlan" (
    "id" UUID NOT NULL,
    "planNumber" TEXT NOT NULL,
    "surveyTitle" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "referencePlanNumber" TEXT,
    "deededArea" TEXT NOT NULL,
    "facilitator" TEXT NOT NULL,
    "pillarType" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "pdfFilePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cadFilePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificateFilePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateLodged" TIMESTAMP(3),
    "redCopyStatus" "SurfboardRedCopyStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "redCopySubmittedAt" TIMESTAMP(3),
    "redCopyFileUrl" TEXT,
    "redCopyError" TEXT,
    "locality" TEXT,
    "possibleChartingRemarks" TEXT,
    "chartingRemarks" TEXT,
    "batchId" TEXT,
    "accountsApprovedBy" TEXT,
    "accountsApprovedAt" TIMESTAMP(3),
    "accountsStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "accountsComment" TEXT,
    "accountsLockedBy" TEXT,
    "accountsLockedAt" TIMESTAMP(3),
    "accountsLockExpiresAt" TIMESTAMP(3),
    "chartingApprovedBy" TEXT,
    "chartingApprovedAt" TIMESTAMP(3),
    "chartingStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "chartingComment" TEXT,
    "chartingLockedBy" TEXT,
    "chartingLockedAt" TIMESTAMP(3),
    "chartingLockExpiresAt" TIMESTAMP(3),
    "surconApprovedBy" TEXT,
    "surconApprovedAt" TIMESTAMP(3),
    "surconStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "surconComment" TEXT,
    "surconLockedBy" TEXT,
    "surconLockedAt" TIMESTAMP(3),
    "surconLockExpiresAt" TIMESTAMP(3),
    "recordsIApprovedBy" TEXT,
    "recordsIApprovedAt" TIMESTAMP(3),
    "recordsIStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "recordsIComment" TEXT,
    "recordsILockedBy" TEXT,
    "recordsILockedAt" TIMESTAMP(3),
    "recordsILockExpiresAt" TIMESTAMP(3),
    "physicalCopySubmitted" BOOLEAN NOT NULL DEFAULT false,
    "physicalCopySubmittedAt" TIMESTAMP(3),
    "recordCopyVerifiedAt" TIMESTAMP(3),
    "recordCopyVerdict" TEXT,
    "recordCopyVerificationData" JSONB,
    "intakeApprovedBy" TEXT,
    "intakeApprovedAt" TIMESTAMP(3),
    "intakeStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "intakeComment" TEXT,
    "intakeLockedBy" TEXT,
    "intakeLockedAt" TIMESTAMP(3),
    "intakeLockExpiresAt" TIMESTAMP(3),
    "recordsIIApprovedBy" TEXT,
    "recordsIIApprovedAt" TIMESTAMP(3),
    "recordsIIStatus" "ApprovalStatus" DEFAULT 'PENDING',
    "recordsIIComment" TEXT,
    "recordsIILockedBy" TEXT,
    "recordsIILockedAt" TIMESTAMP(3),
    "recordsIILockExpiresAt" TIMESTAMP(3),
    "archiveReceivedBy" TEXT,
    "archiveReceivedAt" TIMESTAMP(3),
    "archiveNotes" TEXT,
    "ward" TEXT,
    "lcda" TEXT,
    "lga" TEXT,
    "state" TEXT,
    "zone" TEXT,
    "codFee" DOUBLE PRECISION,
    "isDoubleFee" BOOLEAN NOT NULL DEFAULT false,
    "ethnicity" TEXT,
    "pillars" JSONB NOT NULL,
    "dateOnSurveyPlan" TIMESTAMP(3),
    "reasonForWithdrawalAndResubmission" TEXT,
    "withdrawalAndResubmissionStatus" TEXT DEFAULT 'No_Action',
    "pillarTypeReferencePlanNumber" TEXT,
    "parcels" JSONB,
    "status" "SurfboardPlanStatus" NOT NULL DEFAULT 'PENDING',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "personCount" INTEGER NOT NULL DEFAULT 1,
    "personCountVerified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "sharedTo" TEXT[],
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "queryLasgReceiptUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "queryRemitaReceiptUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qrScanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurfboardPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfboardNotification" (
    "id" TEXT NOT NULL,
    "type" "SurfboardNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "SurfboardNotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
    "link" TEXT,
    "metadata" JSONB,
    "showAsModal" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurfboardNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LGAFeeConfig" (
    "id" TEXT NOT NULL,
    "lgaName" TEXT NOT NULL,
    "ratePerSqM" DOUBLE PRECISION NOT NULL,
    "systemChargePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LGAFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateOfDepositBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL DEFAULT concat('SurfCoD_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    "submittedBy" TEXT NOT NULL,
    "planCount" INTEGER NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL,
    "systemCharges" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "BatchPaymentStatus" NOT NULL DEFAULT 'PENDING_USER_PAYMENT',
    "userPaymentRef" TEXT DEFAULT concat('SurfCoDRef_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    "userPaymentDate" TIMESTAMP(3),
    "userPaymentAmount" DOUBLE PRECISION,
    "lasgReceiptUrl" TEXT,
    "lasgReceiptS3Key" TEXT,
    "remitaReceiptUrl" TEXT,
    "paymentAnchor" TEXT,
    "lasgPaymentDate" TIMESTAMP(3),
    "lasgReceiptUploadedBy" TEXT,
    "lasgReceiptUploadedAt" TIMESTAMP(3),
    "accountsApprovedBy" TEXT,
    "accountsApprovedAt" TIMESTAMP(3),
    "accountsDisapproved" BOOLEAN NOT NULL DEFAULT false,
    "accountsComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateOfDepositBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_settings" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "previousSettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "surfboard_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_earnings_transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "surveyorId" TEXT NOT NULL,
    "serviceType" "QRServiceType" NOT NULL,
    "verificationFee" DOUBLE PRECISION NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "mdaFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "surveyorEarned" DOUBLE PRECISION NOT NULL,
    "payerEmail" TEXT,
    "payerName" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_earnings_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveyor_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveyor_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveyor_bank_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "recipientCode" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveyor_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "requestRef" TEXT NOT NULL DEFAULT concat('WD_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "recipientCode" TEXT,
    "transferCode" TEXT,
    "adminComment" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surfboard_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_plan_share_responses" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,

    CONSTRAINT "surfboard_plan_share_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_plan_share_invites" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "surfboard_plan_share_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_plan_viewer_attachments" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "viewerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surfboard_plan_viewer_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surfboard_plan_comments" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "surfboard_plan_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_audience_idx" ON "Notification"("audience");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_platform_idx" ON "RefreshToken"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_platform_idx" ON "PasswordResetToken"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvitation_platform_email_idx" ON "AdminInvitation"("platform", "email");

-- CreateIndex
CREATE INDEX "AdminInvitation_platform_createdAt_idx" ON "AdminInvitation"("platform", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_platform_idx" ON "EmailVerificationToken"("userId", "platform");

-- CreateIndex
CREATE INDEX "EmailVerificationOtp_userId_platform_idx" ON "EmailVerificationOtp"("userId", "platform");

-- CreateIndex
CREATE INDEX "PendingRegistration_expiresAt_idx" ON "PendingRegistration"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_platform_email_key" ON "PendingRegistration"("platform", "email");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_signature_key" ON "WebhookEvent"("signature");

-- CreateIndex
CREATE INDEX "WebhookEvent_event_platform_idx" ON "WebhookEvent"("event", "platform");

-- CreateIndex
CREATE INDEX "WebhookEvent_entityKey_idx" ON "WebhookEvent"("entityKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "gbc_editions_status_idx" ON "gbc_editions"("status");

-- CreateIndex
CREATE INDEX "gbc_editions_deletedAt_idx" ON "gbc_editions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GBCUser_kindeId_key" ON "GBCUser"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "GBCUser_email_key" ON "GBCUser"("email");

-- CreateIndex
CREATE INDEX "GBCUser_kindeId_idx" ON "GBCUser"("kindeId");

-- CreateIndex
CREATE INDEX "GBCUser_email_idx" ON "GBCUser"("email");

-- CreateIndex
CREATE INDEX "GBCUser_isActive_idx" ON "GBCUser"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "gbc_tickets_ticketNumber_key" ON "gbc_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "gbc_tickets_email_idx" ON "gbc_tickets"("email");

-- CreateIndex
CREATE INDEX "gbc_tickets_phone_idx" ON "gbc_tickets"("phone");

-- CreateIndex
CREATE INDEX "gbc_tickets_ticketNumber_idx" ON "gbc_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "gbc_tickets_paymentRef_idx" ON "gbc_tickets"("paymentRef");

-- CreateIndex
CREATE INDEX "gbc_tickets_paymentStatus_idx" ON "gbc_tickets"("paymentStatus");

-- CreateIndex
CREATE INDEX "gbc_tickets_edition_idx" ON "gbc_tickets"("edition");

-- CreateIndex
CREATE INDEX "gbc_sponsors_edition_idx" ON "gbc_sponsors"("edition");

-- CreateIndex
CREATE INDEX "gbc_partners_edition_idx" ON "gbc_partners"("edition");

-- CreateIndex
CREATE INDEX "gbc_gallery_year_idx" ON "gbc_gallery"("year");

-- CreateIndex
CREATE INDEX "gbc_gallery_edition_idx" ON "gbc_gallery"("edition");

-- CreateIndex
CREATE INDEX "gbc_speakers_edition_idx" ON "gbc_speakers"("edition");

-- CreateIndex
CREATE UNIQUE INDEX "gbc_pages_slug_key" ON "gbc_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "gbc_settings_edition_key" ON "gbc_settings"("edition");

-- CreateIndex
CREATE INDEX "gbc_contact_inquiries_status_idx" ON "gbc_contact_inquiries"("status");

-- CreateIndex
CREATE INDEX "gbc_contact_inquiries_type_idx" ON "gbc_contact_inquiries"("type");

-- CreateIndex
CREATE INDEX "gbc_contact_inquiries_edition_idx" ON "gbc_contact_inquiries"("edition");

-- CreateIndex
CREATE UNIQUE INDEX "gbc_event_stats_date_key" ON "gbc_event_stats"("date");

-- CreateIndex
CREATE INDEX "gbc_event_stats_date_idx" ON "gbc_event_stats"("date");

-- CreateIndex
CREATE INDEX "gbc_event_stats_edition_idx" ON "gbc_event_stats"("edition");

-- CreateIndex
CREATE INDEX "gbc_notifications_status_idx" ON "gbc_notifications"("status");

-- CreateIndex
CREATE INDEX "gbc_notifications_type_idx" ON "gbc_notifications"("type");

-- CreateIndex
CREATE INDEX "gbc_user_notifications_createdAt_idx" ON "gbc_user_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "gbc_user_notifications_audience_idx" ON "gbc_user_notifications"("audience");

-- CreateIndex
CREATE INDEX "gbc_audit_logs_userId_idx" ON "gbc_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "gbc_audit_logs_entity_idx" ON "gbc_audit_logs"("entity");

-- CreateIndex
CREATE INDEX "gbc_audit_logs_createdAt_idx" ON "gbc_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sidx_nigeria_ward_admin_boundaries_geom" ON "nigeria_ward_admin_boundaries" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "sidx_scale_of_fees_geom" ON "Scale_of_fees" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "sidx_lasg_charting_interpretation_geom" ON "LASG_charting_interpretation" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeUserProperty_reference_key" ON "OneTimeUserProperty"("reference");

-- CreateIndex
CREATE INDEX "DownloadOtp_reference_target_email_createdAt_idx" ON "DownloadOtp"("reference", "target", "email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevaUser_kindeId_key" ON "RevaUser"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "RevaUser_email_key" ON "RevaUser"("email");

-- CreateIndex
CREATE INDEX "reva_audit_logs_userId_idx" ON "reva_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "reva_audit_logs_entity_idx" ON "reva_audit_logs"("entity");

-- CreateIndex
CREATE INDEX "reva_audit_logs_createdAt_idx" ON "reva_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardUser_kindeId_key" ON "SurfboardUser"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardUser_email_key" ON "SurfboardUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardUser_surconRegNumber_key" ON "SurfboardUser"("surconRegNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_reference_idx" ON "SubscriptionHistory"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardPlan_planNumber_key" ON "SurfboardPlan"("planNumber");

-- CreateIndex
CREATE INDEX "SurfboardPlan_planNumber_idx" ON "SurfboardPlan"("planNumber");

-- CreateIndex
CREATE INDEX "SurfboardPlan_deleted_idx" ON "SurfboardPlan"("deleted");

-- CreateIndex
CREATE INDEX "SurfboardNotification_createdAt_idx" ON "SurfboardNotification"("createdAt");

-- CreateIndex
CREATE INDEX "SurfboardNotification_audience_idx" ON "SurfboardNotification"("audience");

-- CreateIndex
CREATE INDEX "SurfboardNotification_showAsModal_startsAt_endsAt_idx" ON "SurfboardNotification"("showAsModal", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "LGAFeeConfig_lgaName_key" ON "LGAFeeConfig"("lgaName");

-- CreateIndex
CREATE INDEX "LGAFeeConfig_lgaName_idx" ON "LGAFeeConfig"("lgaName");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateOfDepositBatch_batchCode_key" ON "CertificateOfDepositBatch"("batchCode");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateOfDepositBatch_userPaymentRef_key" ON "CertificateOfDepositBatch"("userPaymentRef");

-- CreateIndex
CREATE INDEX "CertificateOfDepositBatch_batchCode_idx" ON "CertificateOfDepositBatch"("batchCode");

-- CreateIndex
CREATE INDEX "CertificateOfDepositBatch_submittedBy_idx" ON "CertificateOfDepositBatch"("submittedBy");

-- CreateIndex
CREATE INDEX "CertificateOfDepositBatch_paymentStatus_idx" ON "CertificateOfDepositBatch"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "qr_earnings_transactions_reference_key" ON "qr_earnings_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "qr_earnings_transactions_accessToken_key" ON "qr_earnings_transactions"("accessToken");

-- CreateIndex
CREATE INDEX "qr_earnings_transactions_planId_idx" ON "qr_earnings_transactions"("planId");

-- CreateIndex
CREATE INDEX "qr_earnings_transactions_surveyorId_idx" ON "qr_earnings_transactions"("surveyorId");

-- CreateIndex
CREATE INDEX "qr_earnings_transactions_reference_idx" ON "qr_earnings_transactions"("reference");

-- CreateIndex
CREATE INDEX "qr_earnings_transactions_accessToken_idx" ON "qr_earnings_transactions"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "surveyor_wallets_userId_key" ON "surveyor_wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "surveyor_bank_details_userId_key" ON "surveyor_bank_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_requestRef_key" ON "withdrawal_requests"("requestRef");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_idx" ON "withdrawal_requests"("userId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "surfboard_audit_logs_userId_idx" ON "surfboard_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "surfboard_audit_logs_entity_idx" ON "surfboard_audit_logs"("entity");

-- CreateIndex
CREATE INDEX "surfboard_audit_logs_createdAt_idx" ON "surfboard_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_responses_sharedWithUserId_idx" ON "surfboard_plan_share_responses"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_responses_sharedByUserId_idx" ON "surfboard_plan_share_responses"("sharedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "surfboard_plan_share_responses_planId_sharedWithUserId_key" ON "surfboard_plan_share_responses"("planId", "sharedWithUserId");

-- CreateIndex
CREATE UNIQUE INDEX "surfboard_plan_share_invites_tokenHash_key" ON "surfboard_plan_share_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_invites_email_idx" ON "surfboard_plan_share_invites"("email");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_invites_planId_idx" ON "surfboard_plan_share_invites"("planId");

-- CreateIndex
CREATE INDEX "surfboard_plan_viewer_attachments_planId_viewerId_idx" ON "surfboard_plan_viewer_attachments"("planId", "viewerId");

-- CreateIndex
CREATE INDEX "surfboard_plan_comments_planId_idx" ON "surfboard_plan_comments"("planId");

-- AddForeignKey
ALTER TABLE "gbc_tickets" ADD CONSTRAINT "gbc_tickets_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_sponsors" ADD CONSTRAINT "gbc_sponsors_tier_fkey" FOREIGN KEY ("tier") REFERENCES "gbc_sponsor_tiers"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_sponsors" ADD CONSTRAINT "gbc_sponsors_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_partners" ADD CONSTRAINT "gbc_partners_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_gallery" ADD CONSTRAINT "gbc_gallery_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_speakers" ADD CONSTRAINT "gbc_speakers_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_settings" ADD CONSTRAINT "gbc_settings_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_contact_inquiries" ADD CONSTRAINT "gbc_contact_inquiries_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_event_stats" ADD CONSTRAINT "gbc_event_stats_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RevaUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CertificateOfDepositBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_accountsApprovedBy_fkey" FOREIGN KEY ("accountsApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_chartingApprovedBy_fkey" FOREIGN KEY ("chartingApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_surconApprovedBy_fkey" FOREIGN KEY ("surconApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_recordsIApprovedBy_fkey" FOREIGN KEY ("recordsIApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_intakeApprovedBy_fkey" FOREIGN KEY ("intakeApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_recordsIIApprovedBy_fkey" FOREIGN KEY ("recordsIIApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOfDepositBatch" ADD CONSTRAINT "CertificateOfDepositBatch_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "SurfboardUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOfDepositBatch" ADD CONSTRAINT "CertificateOfDepositBatch_accountsApprovedBy_fkey" FOREIGN KEY ("accountsApprovedBy") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surfboard_settings" ADD CONSTRAINT "surfboard_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "SurfboardUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_earnings_transactions" ADD CONSTRAINT "qr_earnings_transactions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_earnings_transactions" ADD CONSTRAINT "qr_earnings_transactions_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "SurfboardUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveyor_wallets" ADD CONSTRAINT "surveyor_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveyor_bank_details" ADD CONSTRAINT "surveyor_bank_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SurfboardUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surfboard_plan_share_responses" ADD CONSTRAINT "surfboard_plan_share_responses_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surfboard_plan_share_invites" ADD CONSTRAINT "surfboard_plan_share_invites_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surfboard_plan_viewer_attachments" ADD CONSTRAINT "surfboard_plan_viewer_attachments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surfboard_plan_comments" ADD CONSTRAINT "surfboard_plan_comments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;


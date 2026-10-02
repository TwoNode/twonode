# GBC 2.0 Platform

> Official ticketing and conference management platform for Geospatial Builders Conference 2.0

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-teal)
![AWS S3](https://img.shields.io/badge/AWS-S3-orange)
![Zoho](https://img.shields.io/badge/Zoho-Mail-red)

## 🌟 Overview

Modern, server-action-based conference management platform built with Next.js 14, featuring:

- **🎫 Ticketing** - Secure purchase with Paystack + QR codes
- **👥 Admin Dashboard** - Complete management with real-time analytics
- **📱 QR Check-In** - Mobile-friendly scanner
- **📧 Email/SMS** - Automated notifications via Zoho
- **☁️ AWS S3** - Scalable media storage
- **🔐 Kinde Auth** - Passwordless authentication

**Theme**: Geospatial Capital: A Catalyst for Inclusive Growth  
**Sub-Theme**: Driving Transformation in Land Administration and Energy  
**Hashtag**: #GBC2.0

---

## 🎯 Key Features

### Database Models (GBC-Prefixed)

- ✅ `GBCUser` - User management with roles
- ✅ `GBCTicket` - Ticket records with QR codes
- ✅ `GBCSponsor` - Sponsor management by tier
- ✅ `GBCPartner` - Partner showcase
- ✅ `GBCGallery` - Photo/video gallery
- ✅ `GBCSpeaker` - Speaker profiles
- ✅ `GBCContactInquiry` - Contact form submissions
- ✅ `GBCNotification` - Email/SMS tracking
- ✅ `GBCAuditLog` - Activity logging

### Email & SMS (Zoho)

- ✅ Nodemailer with Zoho SMTP
- ✅ Professional email templates
- ✅ SMS via Termii or Africa's Talking
- ✅ Bulk messaging support
- ✅ Delivery tracking

### File Storage (AWS S3)

- ✅ Automatic image optimization
- ✅ Thumbnail generation
- ✅ Organized folder structure
- ✅ Sponsor/partner logos
- ✅ Speaker photos
- ✅ Gallery media
- ✅ QR code storage

### Admin Features

- ✅ Real-time dashboard
- ✅ Ticket management & export
- ✅ QR scanner for check-in
- ✅ Content management
- ✅ File uploads
- ✅ User role management
- ✅ Audit logging

---

## 🛠️ Tech Stack

| Category             | Technology                |
| -------------------- | ------------------------- |
| **Framework**        | Next.js 14 (App Router)   |
| **Language**         | TypeScript                |
| **Authentication**   | Kinde Auth                |
| **Database**         | PostgreSQL + Prisma       |
| **Storage**          | AWS S3                    |
| **Email**            | Zoho Mail (Nodemailer)    |
| **SMS**              | Termii / Africa's Talking |
| **Payment**          | Paystack                  |
| **Styling**          | Tailwind CSS              |
| **Components**       | shadcn/ui                 |
| **Validation**       | Zod                       |
| **Image Processing** | Sharp                     |
| **QR Codes**         | qrcode + HMAC             |

---

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Kinde account
- AWS account (S3)
- Zoho Mail account
- Paystack account
- SMS provider (optional)

---

## 🚀 Installation

### 1. Create Project

```bash
npx create-next-app@latest gbc-platform --typescript --tailwind --app --src-dir
cd gbc-platform
```

### 2. Install Dependencies

```bash
npm install @kinde-oss/kinde-auth-nextjs @prisma/client prisma
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install nodemailer sharp qrcode zod
npm install @tanstack/react-query zustand
npm install react-hook-form date-fns clsx tailwind-merge
npm install lucide-react framer-motion react-hot-toast server-only
```

### 3. Setup Services

See [Complete Setup Guide](./SETUP.md) for detailed instructions on:

- Kinde Auth configuration
- AWS S3 bucket setup
- Zoho Mail SMTP
- SMS provider integration
- Paystack configuration

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 5. Setup Database

```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Start Development

```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── actions/                    # Server Actions
│   ├── ticket-actions.ts      # GBC ticket operations
│   ├── sponsor-actions.ts     # GBC sponsor/partner CRUD
│   ├── contact-actions.ts     # GBC inquiries
│   └── upload-actions.ts      # AWS S3 uploads
├── app/
│   ├── admin/                 # Protected admin pages
│   ├── api/auth/[kindeAuth]/ # Kinde auth handler
│   └── ...
├── components/
│   ├── ui/                    # shadcn components
│   ├── admin/                 # Admin components
│   └── public/                # Public components
├── lib/
│   ├── auth.ts               # Kinde helpers
│   ├── db.ts                 # Prisma client
│   ├── aws-s3.ts             # S3 operations
│   ├── email.ts              # Zoho email
│   ├── sms.ts                # SMS service
│   ├── qrcode.ts             # QR generation
│   ├── paystack.ts           # Payment
│   ├── utils.ts              # Utilities
│   └── validations.ts        # Zod schemas
└── middleware.ts             # Auth middleware
```

---

## 🔧 Configuration

### Ticket Types & Pricing

```env
NEXT_PUBLIC_EARLY_BIRD_PRICE=100000    # ₦100,000
NEXT_PUBLIC_REGULAR_PRICE=120000       # ₦120,000
NEXT_PUBLIC_COMPANY_PRICE=250000       # ₦250,000
NEXT_PUBLIC_MAX_TICKETS=1000
```

### Event Details

```env
NEXT_PUBLIC_EVENT_DATE="2025-05-15"
NEXT_PUBLIC_EVENT_LOCATION="Lagos, Nigeria"
NEXT_PUBLIC_EVENT_VENUE="Conference Center, Lagos"
```

### Feature Flags

```env
ENABLE_SMS_NOTIFICATIONS="true"
ENABLE_EMAIL_NOTIFICATIONS="true"
ENABLE_STUDENT_TICKETS="false"
```

---

## 📝 Key Functions

### Ticket Management

```typescript
// Create ticket
const result = await createGBCTicket(formData);

// Check-in
await checkInGBCTicket(ticketNumber);

// Get statistics
const stats = await getGBCTicketStats();

// Export attendees
const tickets = await exportGBCTickets();
```

### File Uploads

```typescript
// Upload sponsor logo
await uploadGBCSponsorLogo(formData);

// Upload speaker photo
await uploadGBCSpeakerPhoto(formData);

// Upload gallery media
await uploadGBCGalleryMedia(formData);
```

### Notifications

```typescript
// Send ticket confirmation
await sendGBCTicketConfirmation(ticketData);

// Send SMS
await sendGBCTicketSMS(phone, name, ticketNumber, date);

// Broadcast to all
await sendGBCBroadcastSMS(message, recipients);
```

---

## 🗄️ Database Schema Highlights

All models prefixed with `GBC`:

```prisma
model GBCTicket {
  ticketNumber    String  @unique
  qrCode          String?
  qrCodeS3Key     String? // AWS S3 key
  checkedIn       Boolean @default(false)
  checkedInBy     String? // Admin email
  // ...
}

model GBCSponsor {
  logo        String
  logoS3Key   String?     // AWS S3 key
  tier        GBCSponsorTier
  // ...
}

model GBCNotification {
  type        GBCNotificationType // EMAIL, SMS, PUSH
  status      GBCNotificationStatus
  // ...
}
```

---

## 🔐 Security

- ✅ Kinde OAuth2 authentication
- ✅ Server-side validation (Zod)
- ✅ HMAC-signed QR codes
- ✅ Protected server actions
- ✅ AWS IAM for S3 access
- ✅ Encrypted SMTP credentials
- ✅ Rate limiting ready
- ✅ Audit logging

---

## 🧪 Testing

### Test Email

```typescript
import { sendGBCTicketConfirmation } from "@/lib/email";

await sendGBCTicketConfirmation({
  name: "Test User",
  email: "test@example.com",
  // ...
});
```

### Test SMS

```typescript
import { sendSMS } from "@/lib/sms";

await sendSMS("+2348012345678", "Test message");
```

### Test S3 Upload

```typescript
import { uploadLogo } from "@/lib/aws-s3";

const buffer = fs.readFileSync("logo.png");
const result = await uploadLogo(buffer, "logo.png", "sponsor");
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Environment Variables

Set these in Vercel dashboard:

- All Kinde credentials
- AWS S3 credentials
- Zoho SMTP credentials
- Paystack keys
- Database URL

### Post-Deployment

1. Create admin user in Kinde
2. Update role to ADMIN in database
3. Test email delivery
4. Test S3 uploads
5. Configure custom domain

---

## 📊 Monitoring

- **Vercel Analytics** - Performance metrics
- **AWS CloudWatch** - S3 metrics
- **Prisma Studio** - Database inspection
- **Audit Logs** - User activity tracking

---

## 🎓 Documentation

- [Setup Guide](./SETUP.md) - Complete installation
- [API Reference](./docs/API.md) - Server actions
- [Database Schema](./docs/SCHEMA.md) - Prisma models
- [Deployment Guide](./docs/DEPLOY.md) - Production setup

---

## 📞 Support

**Two Node Technologies**

- 📧 Email: info@twonodetechnologies.com
- 📱 Phone: +234-916-0002-740
- 📍 Address: No. 58 Kudirat Abiola Way, Oregun, Ikeja, Lagos
- 🌐 Website: www.twonodetechnologies.com

---

## 🙏 Acknowledgments

- Next.js team
- Kinde for auth
- AWS for infrastructure
- Zoho for email
- Paystack for payments
- shadcn for UI components

---

## 📄 License

Proprietary - © 2025 Two Node Technologies

---

**Built with ❤️ for GBC 2.0**

#GBC2.0 | #GeospatialCapital | #InclusiveGrowth

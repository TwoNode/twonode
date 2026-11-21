/**
 * The text of Surfboard's Privacy Policy and Terms of Use.
 *
 * DRAFT for review by counsel against the Nigeria Data Protection Act 2023 and the NDPC's 2025
 * GAID before it is relied on (TASK-0015 item 0.4). Every statement here must stay true to what the
 * code does: when a data field, a service provider or a retention rule changes, change this text in
 * the same pull request and raise LEGAL_VERSION.
 */

export const LEGAL_VERSION = "2026-11-21";
export const LEGAL_EFFECTIVE_DATE = "21 November 2026";
export const LEGAL_CONTACT_EMAIL = "info@twonodetechnologies.com";

export const SURFBOARD_PRIVACY_PATH = "/surfboard/privacy";
export const SURFBOARD_TERMS_PATH = "/surfboard/terms";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalDoc = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

const COMPANY =
  "TwoNode Technologies Ltd. (RC 7742902), 58 Kudirat Abiola Way, Oregun, Lagos State, Nigeria";

export const SURFBOARD_PRIVACY: LegalDoc = {
  title: "Surfboard Privacy Policy",
  intro:
    "Surfboard is a service of TwoNode Technologies Ltd. that helps licensed surveyors lodge, track and share survey plans. This policy explains what personal data we collect when you use Surfboard (the website and the mobile app), why, who sees it, and the choices you have.",
  sections: [
    {
      heading: "Who is responsible for your data",
      paragraphs: [
        `${COMPANY} ("TwoNode", "we", "us") decides how and why your data is used on Surfboard, so we are the data controller under the Nigeria Data Protection Act 2023.`,
        `Questions, requests and complaints: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: "What we collect",
      items: [
        "Your account: first and last name, email address, a password (stored only as a one-way hash, never as text) and whether your email is verified. If you sign in with Google, we receive your name and email from Google.",
        "Your professional details, when you add them: SURCON registration number and name, company name and address, phone number, state of residence, postal code, name prefix and suffix, your logo and your signature image.",
        "Your survey plans: plan number, title, type, area, facilitator, pillar type, the plan's outline and location, and the files you upload (plan PDF, CAD file, certificates, record copy).",
        "Payments and earnings: subscription and Certificate of Deposit payment status and references, wallet balances and QR-earnings transactions. If you request a withdrawal, your bank name, account number and account name. We never see or store your card details: card payments are taken by Paystack, and Remita payments on Remita's own pages.",
        "Sharing and comments: the people you share a plan with (by email), their responses, and comments on a plan.",
        "Map features in the app, only when you use them: when you tap Navigate or Direction, the position of your phone and the nearest corner of the plan; when you search for a place, the words you type and roughly where the map is looking; when you tap the map to find out what is there, the point you tapped. We send these through our server to Google to draw the route, list matching places and name the address. Our application does not store them, and we only count how many such requests an account makes in a day, to limit abuse, not what they contained. The map itself is drawn by Google's Maps software inside the app, which contacts Google directly (see Who we share it with).",
        "App and device data: a push-notification address for your phone, your device type and app version, the devices signed in to your account, and crash or error notes from the app.",
        "Security records: sign-in attempts, audit entries of important actions on your account and plans, and the network address (IP) of requests, used to keep the service safe.",
      ],
    },
    {
      heading: "Why we use it, and our legal basis",
      items: [
        "To create your account, sign you in and keep it secure (performance of our agreement with you).",
        "To store, display, share and submit your survey plans and to process Certificate of Deposit batches through the government (MDA) review (performance of our agreement with you).",
        "To take payments, run your wallet and pay out earnings (performance of our agreement with you; legal obligations).",
        "To send you the emails and notifications the service depends on: verification codes, password resets, plan queries, shared plans, payment receipts (performance of our agreement; our legitimate interest in running the service).",
        "To prevent fraud and abuse, fix faults and improve Surfboard (our legitimate interests).",
        "To keep records and answer legal requests where the law requires it (legal obligation).",
        "Where we rely on your consent (for example, notifications you switch on in the app), you can withdraw it at any time in the app's settings without affecting what happened before.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "We do not sell your personal data. We share it only as needed to run Surfboard:",
      ],
      items: [
        "Government bodies and the offices involved in reviewing and recording a plan you submit (the MDAs), who see the plan, its files and your professional details as part of that review.",
        "People you choose: when you share a plan, the person you share it with can see that plan and the comments on it. A plan's public page shows plan details to anyone who opens its link or scans its QR code.",
        "Service providers who process data for us: cloud hosting and database services, cloud file storage, email delivery, push-notification delivery (Expo, and Apple and Google's push services), Paystack and Remita for payments, and Kinde for Google sign-in. They may use your data only to provide their service to us.",
        "Google (Google Maps Platform), for the map, routes, place search and address lookup in the app. The map shown in the app is drawn by Google's Maps software, which contacts Google directly and so receives the usual technical information from your phone (such as its network address) and the area you are viewing. Your position, searches and taps for the map features described above reach Google through our server. Like every request to our servers, they also pass through our hosting provider, whose standard request records may keep the address of a request, including the position it carries, for a short time. Google handles this data under its own terms and privacy policy: Google Maps and Google Earth Additional Terms of Service (https://www.google.com/intl/en-US_US/help/terms_maps/) and Google Privacy Policy (https://policies.google.com/privacy).",
        "Authorities, courts or professional advisers, where the law requires or to protect rights, safety and the service.",
      ],
    },
    {
      heading: "Where your data is kept, and transfers abroad",
      paragraphs: [
        "Some of our providers keep or process data outside Nigeria. Where your data leaves Nigeria we rely on a lawful transfer basis under the Nigeria Data Protection Act 2023 and ask the provider to protect it to an equivalent standard.",
      ],
    },
    {
      heading: "How long we keep it",
      items: [
        "Account and plan data: for as long as your account is open, and afterwards for as long as we need it to meet legal, accounting and record-keeping duties or to resolve disputes.",
        "If you close your account (in the app: Profile, then Delete account), we erase your name, email address, phone number, address, company details, logo, signature, bank details, sign-ins and devices, and we cancel any subscription. We keep the survey plans on your account, including plans you never submitted, and payment and withdrawal records and audit entries, with no personal details attached to the account. Plans you shared stay shared with the people you shared them with. A record we keep may still contain names you typed into it, such as a plan's title or a client's name.",
        "We cannot close an account while it holds money in the wallet or a withdrawal that has not been paid out; withdraw the money first.",
        "Sign-in attempt and security records are kept for a limited period for security and then removed.",
        "Verification codes and pending registrations expire within minutes and are removed after use or expiry.",
      ],
    },
    {
      heading: "How we protect it",
      paragraphs: [
        "Passwords are hashed; connections use HTTPS; access to plan files is checked against your account; sessions can be ended from the devices list; and sign-in is rate-limited. No system is perfectly secure. If a breach is likely to put your rights at risk we will tell the Nigeria Data Protection Commission and, where required, you, as the law says.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        `Under the Nigeria Data Protection Act 2023 you may ask us to give you access to your data, correct it, delete it, restrict or object to how we use it, and give it to you in a portable form, and you may withdraw consent. Write to ${LEGAL_CONTACT_EMAIL}; we will answer within a reasonable time and may first need to confirm it is you. You can correct most details yourself in Profile and Settings.`,
        "You can close your account yourself in the app (Profile, then Delete account); what that erases and what we keep is described under How long we keep it. For anything else, write to us.",
        "You may also complain to the Nigeria Data Protection Commission (NDPC).",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Surfboard is for licensed survey professionals and is not meant for anyone under 18. We do not knowingly collect data from children.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        `We will post any change on this page with a new date. If a change is important, we will also tell you in the app or by email. This version is dated ${LEGAL_EFFECTIVE_DATE}.`,
      ],
    },
  ],
};

export const SURFBOARD_TERMS: LegalDoc = {
  title: "Surfboard Terms of Use",
  intro:
    "These terms are the agreement between you and TwoNode Technologies Ltd. for using Surfboard, the website and the mobile app. By creating an account or using Surfboard you accept them. If you do not accept them, do not use Surfboard.",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        `Surfboard is provided by ${COMPANY}. Contact: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: "Your account",
      items: [
        "Surfboard is for licensed surveyors and the people they work with. You must be at least 18 and give accurate details, including your SURCON registration where it is asked for.",
        "Keep your password and devices safe. You are responsible for what is done through your account. Tell us at once if you think someone else has used it.",
        "One person, one account. Do not share your sign-in.",
      ],
    },
    {
      heading: "Your plans and files",
      items: [
        "You keep the ownership of the plans and files you upload. You give us permission to store, process, display and send them as needed to run Surfboard: to show them to the people you share them with, to show a plan's public page, and to submit them to the government offices when you lodge a plan or batch.",
        "You promise that you have the right to upload what you upload, that it is accurate, and that you are not breaking anyone's rights or the law by doing so.",
        "Lodging a plan or a Certificate of Deposit batch is your act. Approval, queries and rejections are decisions of the government offices, not of TwoNode, and we do not guarantee any outcome or timing.",
      ],
    },
    {
      heading: "Payments, subscriptions and earnings",
      items: [
        "Fees are shown before you pay. Card payments are taken by Paystack and Certificate of Deposit payments through Remita, under their own terms.",
        "A subscription continues for the period you paid for; what happens when it ends is shown in the app.",
        "Wallet balances and QR earnings are paid out to the bank account you give us, after any checks we need to make. Check that the account details are right: we cannot recover a transfer to a wrong account you entered.",
        `If you think you were charged wrongly, write to ${LEGAL_CONTACT_EMAIL} with the payment reference.`,
      ],
    },
    {
      heading: "What you must not do",
      items: [
        "Use Surfboard to break the law, or to submit false or forged plans, signatures or documents.",
        "Try to get into accounts, plans or systems that are not yours, probe or disrupt the service, or scrape it automatically.",
        "Upload malicious files, or copy, resell or reverse-engineer Surfboard except as the law allows.",
        "Use the QR-earnings feature to create fake scans or payments.",
      ],
    },
    {
      heading: "Our right to act",
      paragraphs: [
        "We may suspend or close an account, remove content, or hold a payout where we reasonably believe these terms or the law are being broken, or to protect other users or the service. We will tell you why where we can. You may stop using Surfboard and ask us to close your account at any time; the privacy policy explains what we keep.",
      ],
    },
    {
      heading: "The service as it is",
      paragraphs: [
        "We work to keep Surfboard available and correct but it is provided as it is. It depends on other services (the government's review, payment providers, mapping data) that we do not control, and map positions are for guidance, not a substitute for a survey. We may change or stop a feature, and will give notice of a change that matters.",
      ],
    },
    {
      heading: "Our responsibility",
      paragraphs: [
        "Nothing in these terms limits a liability that the law does not allow us to limit. Subject to that, TwoNode is not liable for losses that were not a foreseeable result of our breach, for lost profit or business, or for delays or decisions of government offices and payment providers, and our total liability to you for any claim is limited to the fees you paid us for Surfboard in the twelve months before the claim.",
      ],
    },
    {
      heading: "Your data",
      paragraphs: [
        "How we use your personal data is explained in the Surfboard Privacy Policy, which forms part of these terms.",
      ],
    },
    {
      heading: "Changes, law and disputes",
      items: [
        `We may change these terms. We will post the new version here with its date and, for important changes, tell you in the app or by email. Using Surfboard after a change means you accept it. This version is dated ${LEGAL_EFFECTIVE_DATE}.`,
        "These terms are governed by the laws of the Federal Republic of Nigeria. We will first try to settle any dispute by talking to you; if that fails, the courts of Lagos State, Nigeria, have jurisdiction.",
      ],
    },
  ],
};

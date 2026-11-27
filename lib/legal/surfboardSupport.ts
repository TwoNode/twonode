/**
 * The text of the Surfboard support page, `/surfboard/support`.
 *
 * Both stores want a web address that loads without signing in: Apple's "Support URL" and Google
 * Play's "account deletion" address (TASK-0015 item 0.4, I-063). The page says how to reach us and
 * how to delete an account, from the app or, for someone who cannot open it, by email. What closing
 * an account erases and keeps is the Privacy Policy's own text (shared constants), never a second
 * copy that could drift. Steps in the app follow `src/app/(tabs)/profile.tsx` and
 * `src/app/delete-account.tsx` in the app repo: Profile, the Account row "Delete account", the
 * password, a tick to confirm.
 */
import {
  ACCOUNT_CLOSURE_BLOCKED,
  ACCOUNT_CLOSURE_ERASED_AND_KEPT,
  LEGAL_CONTACT_EMAIL,
  SURFBOARD_PRIVACY_PATH,
  type LegalDoc,
} from "./surfboard";

export const SURFBOARD_SUPPORT_DELETE_SUBJECT = "Delete my Surfboard account";

export const SURFBOARD_SUPPORT: LegalDoc = {
  title: "Surfboard support",
  intro:
    "Surfboard is a service of TwoNode Technologies Ltd. that helps licensed surveyors lodge, track and share survey plans. This page says how to reach us and how to delete your Surfboard account and the personal data on it.",
  sections: [
    {
      heading: "Contact us",
      paragraphs: [
        `Write to ${LEGAL_CONTACT_EMAIL}. Tell us the email address you sign in with and what happened; a screenshot helps. Never send your password. We answer within a reasonable time.`,
        "You can also use the chat button on twonodetechnologies.com to reach our support line.",
      ],
    },
    {
      heading: "Forgotten password or cannot sign in",
      paragraphs: [
        "On the sign-in screen, tap Forgot password? and follow the link we email you. If the email does not arrive, check your spam folder, then write to us.",
      ],
    },
    {
      heading: "Delete your account in the app",
      items: [
        "Open Surfboard and sign in.",
        "Go to Profile and scroll to the Account section.",
        "Tap Delete account.",
        'Read what is deleted and what we keep, enter your password and tick "I understand my account will be deleted for good."',
        "Tap Delete my account. You are signed out and the account can no longer be used.",
      ],
    },
    {
      heading: "What deleting erases, and what we keep",
      paragraphs: [ACCOUNT_CLOSURE_ERASED_AND_KEPT, ACCOUNT_CLOSURE_BLOCKED],
    },
    {
      heading: "If you cannot open the app",
      paragraphs: [
        `Write to ${LEGAL_CONTACT_EMAIL} from the email address on the account, with the subject "${SURFBOARD_SUPPORT_DELETE_SUBJECT}". We may first need to confirm it is you. We then close the account in the same way: the same details are erased and the same records are kept, as described above and in the Privacy Policy.`,
      ],
    },
    {
      heading: "Your other data rights",
      paragraphs: [
        `To see, correct, restrict or move your data, or to complain, see the Privacy Policy (${SURFBOARD_PRIVACY_PATH}) or write to us.`,
      ],
    },
  ],
};

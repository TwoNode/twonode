import { NextResponse } from "next/server";

/**
 * Tells Android which app may open links on this site (Android App Links, TASK-0015 1H.2): the
 * counterpart of `apple-app-site-association` for iOS. Android fetches it from the live site only,
 * over https with no redirect, when the app is installed and its manifest asks for verification
 * (`autoVerify` on the verification link in the app's `app.json`). It only proves that the app and
 * this site belong together; which paths open the app is the app's own list (the email
 * verification link only: the reset link stays on the website, TASK-0002 P3-D1).
 *
 * The fingerprint is the SHA-256 of the certificate the app is signed with (the public part of
 * the key EAS holds; read from a finished build with `apksigner verify --print-certs`). When the
 * app is published on Google Play with Play App Signing, Play re-signs it with its own key: add
 * that key's SHA-256 (Play Console, App signing) to this list, or the link will open the browser
 * for people who installed from the store.
 */
export const dynamic = "force-static";

export const ANDROID_PACKAGE = "com.twonode.surfboard";
export const ANDROID_CERT_SHA256 = [
  // The EAS-held key that signs the preview, demo and release APKs.
  "9B:8A:1F:A5:99:B4:1B:E2:62:65:EA:D6:60:E8:5C:11:10:DF:FB:AD:89:5A:E6:1D:0E:26:79:0A:8C:E4:5C:8A",
];

export function GET() {
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: ANDROID_CERT_SHA256,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

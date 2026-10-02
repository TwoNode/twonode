/**
 * Filters for the admin KYC review page. A surveyor has two independent
 * approvals — the account itself (KYC) and the payout bank account — so the
 * filters cover both, and each carries a count for the tab that shows it.
 */

export type KycFilter =
  | "all"
  | "kyc-pending"
  | "kyc-validated"
  | "bank-awaiting"
  | "bank-verified"
  | "bank-missing";

export const KYC_FILTERS: { value: KycFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "kyc-pending", label: "KYC pending" },
  { value: "kyc-validated", label: "KYC validated" },
  { value: "bank-awaiting", label: "Bank awaiting approval" },
  { value: "bank-verified", label: "Bank verified" },
  { value: "bank-missing", label: "No bank account" },
];

export type KycFilterRow = {
  isKycValidated: boolean;
  bankDetails: { isVerified: boolean } | null;
};

export function matchesKycFilter(
  row: KycFilterRow,
  filter: KycFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "kyc-pending":
      return !row.isKycValidated;
    case "kyc-validated":
      return row.isKycValidated;
    case "bank-awaiting":
      return row.bankDetails !== null && !row.bankDetails.isVerified;
    case "bank-verified":
      return row.bankDetails?.isVerified === true;
    case "bank-missing":
      return row.bankDetails === null;
  }
}

export function countByKycFilter(
  rows: KycFilterRow[]
): Record<KycFilter, number> {
  const counts = Object.fromEntries(
    KYC_FILTERS.map((f) => [f.value, 0])
  ) as Record<KycFilter, number>;
  for (const row of rows) {
    for (const { value } of KYC_FILTERS) {
      if (matchesKycFilter(row, value)) counts[value] += 1;
    }
  }
  return counts;
}

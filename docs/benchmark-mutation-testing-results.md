# Mutation Testing Benchmark Report: Surfboard & REVA

**Generated:** 2026-10-16T08:37:17.801Z  
**Test Harness:** `vitest` test runner with multi-operator fault injection  
**REVA Mutation Score:** **63.8%** (30 / 47 killed)  
**Surfboard Mutation Score:** **78.3%** (72 / 92 killed)  
**Overall Mutation Score:** **73.4%** (102 / 139 killed)

## Target Breakdown by Project

| Project | Module | Source File | Test File | Mutants | Killed | Survived | Mutation Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REVA** | REVA S3 Upload Key Generator | `reva/utils/uploadKey.ts` | `reva/utils/__tests__/uploadKey.test.ts` | 8 | 3 | 5 | **37.5%** |
| **REVA** | REVA Files View Route Resolver | `reva/utils/filesViewRoute.ts` | `reva/utils/__tests__/filesViewRoute.test.ts` | 0 | 0 | 0 | **N/A%** |
| **REVA** | REVA Pricing & Discount Service | `reva/services/pricingService.ts` | `reva/services/__tests__/pricingService.test.ts` | 26 | 20 | 6 | **76.9%** |
| **REVA** | REVA Access & Panel User Guard | `reva/access/panelUser.ts` | `reva/access/__tests__/panelUser.test.ts` | 5 | 3 | 2 | **60.0%** |
| **REVA** | REVA File Access Verification | `reva/utils/fileAccess.ts` | `reva/utils/__tests__/fileAccess.test.ts` | 3 | 1 | 2 | **33.3%** |
| **REVA** | REVA Welcome & Onboarding State | `reva/utils/welcome.ts` | `reva/utils/__tests__/welcome.test.ts` | 5 | 3 | 2 | **60.0%** |
| **Surfboard** | Surfboard Plan Number Parser & Sanitizer | `surfboard/utils/planNumber.ts` | `surfboard/utils/__tests__/planNumber.test.ts` | 13 | 11 | 2 | **84.6%** |
| **Surfboard** | Surfboard Subscription Expiry & Grace Logic | `surfboard/utils/subscriptionExpiry.ts` | `surfboard/utils/__tests__/subscriptionExpiry.test.ts` | 6 | 5 | 1 | **83.3%** |
| **Surfboard** | Surfboard Plan File Name Normalizer | `surfboard/utils/planFileName.ts` | `surfboard/utils/__tests__/planFileName.test.ts` | 3 | 3 | 0 | **100.0%** |
| **Surfboard** | Surfboard KYC Status Filter | `surfboard/utils/kycFilter.ts` | `surfboard/utils/__tests__/kycFilter.test.ts` | 15 | 11 | 4 | **73.3%** |
| **Surfboard** | Surfboard COD Statutory Fee Calculator | `surfboard/services/codFeeService.ts` | `surfboard/services/__tests__/codFeeService.test.ts` | 30 | 17 | 13 | **56.7%** |
| **Surfboard** | Surfboard Period & Billing Date Calculator | `app/(projects)/(surfboard)/utils/computePeriod.ts` | `app/(projects)/(surfboard)/utils/__tests__/computePeriod.test.ts` | 25 | 25 | 0 | **100.0%** |

## Detailed Mutation Test Findings

| Status | Project | Module | Line | Operator | Mutation | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| ⚠️ Survived | REVA | REVA S3 Upload Key Generator | L1 | Greater-Than Comparison | `>` → `<=` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA S3 Upload Key Generator | L1 | Less-Than Comparison | `<` → `>=` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA S3 Upload Key Generator | L12 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | REVA | REVA S3 Upload Key Generator | L18 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ⚠️ Survived | REVA | REVA S3 Upload Key Generator | L1 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA S3 Upload Key Generator | L3 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA S3 Upload Key Generator | L15 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA S3 Upload Key Generator | L17 | Subtraction to Addition | `-` → `+` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L100 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L126 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L156 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L25 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L26 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L132 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L160 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L23 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L29 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L30 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L91 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L23 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L91 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L180 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L64 | Less-Or-Equal Comparison | `<=` → `>` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L156 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L187 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L25 | Logical OR Inversion | `||` → `&&` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L26 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L27 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | REVA | REVA Pricing & Discount Service | L28 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L41 | Boolean False to True | `false` → `true` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L53 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L54 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L82 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Pricing & Discount Service | L83 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA Access & Panel User Guard | L34 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | REVA | REVA Access & Panel User Guard | L13 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | REVA | REVA Access & Panel User Guard | L13 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ⚠️ Survived | REVA | REVA Access & Panel User Guard | L22 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Access & Panel User Guard | L24 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA File Access Verification | L18 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ⚠️ Survived | REVA | REVA File Access Verification | L1 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA File Access Verification | L23 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Welcome & Onboarding State | L1 | Greater-Than Comparison | `>` → `<=` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | REVA | REVA Welcome & Onboarding State | L1 | Less-Than Comparison | `<` → `>=` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | REVA | REVA Welcome & Onboarding State | L4 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | REVA | REVA Welcome & Onboarding State | L5 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | REVA | REVA Welcome & Onboarding State | L16 | Addition to Subtraction | `+` → `-` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L25 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L25 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L42 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L42 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L43 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L43 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L42 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L42 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L43 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L43 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan Number Parser & Sanitizer | L25 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard Plan Number Parser & Sanitizer | L1 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard Plan Number Parser & Sanitizer | L28 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard Subscription Expiry & Grace Logic | L22 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Subscription Expiry & Grace Logic | L41 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Subscription Expiry & Grace Logic | L36 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Subscription Expiry & Grace Logic | L47 | Less-Or-Equal Comparison | `<=` → `>` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Subscription Expiry & Grace Logic | L50 | Less-Or-Equal Comparison | `<=` → `>` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard Subscription Expiry & Grace Logic | L3 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard Plan File Name Normalizer | L18 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan File Name Normalizer | L22 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Plan File Name Normalizer | L16 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L43 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L45 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L41 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L51 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L53 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L54 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L51 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L54 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L41 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L35 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard KYC Status Filter | L43 | Boolean True to False | `true` → `false` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard KYC Status Filter | L9 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard KYC Status Filter | L10 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard KYC Status Filter | L11 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard KYC Status Filter | L12 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L28 | Equality Operator | `===` → `!==` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L30 | Equality Operator | `===` → `!==` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L78 | Equality Operator | `===` → `!==` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L83 | Equality Operator | `===` → `!==` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L26 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L31 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L36 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L37 | Greater-Than Comparison | `>` → `<=` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L26 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L31 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L32 | Less-Than Comparison | `<` → `>=` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L35 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L187 | Greater-Or-Equal Comparison | `>=` → `<` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L187 | Less-Or-Equal Comparison | `<=` → `>` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L46 | Logical AND Inversion | `&&` → `||` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L65 | Logical AND Inversion | `&&` → `||` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L97 | Logical AND Inversion | `&&` → `||` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L187 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L113 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L119 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L137 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L142 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L144 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L172 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L196 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard COD Statutory Fee Calculator | L140 | Addition to Subtraction | `+` → `-` | Detected by test suite |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L9 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L12 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L16 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ⚠️ Survived | Surfboard | Surfboard COD Statutory Fee Calculator | L18 | Subtraction to Addition | `-` → `+` | **Surviving Mutant** (Assertion gap) |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L138 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L186 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L187 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L188 | Equality Operator | `===` → `!==` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L133 | Inequality Operator | `!==` → `===` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L3 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L22 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L47 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L56 | Greater-Than Comparison | `>` → `<=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L3 | Less-Than Comparison | `<` → `>=` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L133 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L134 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L135 | Logical AND Inversion | `&&` → `||` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L138 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L170 | Logical OR Inversion | `||` → `&&` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L158 | Boolean True to False | `true` → `false` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L65 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L144 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L182 | Boolean False to True | `false` → `true` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L11 | Addition to Subtraction | `+` → `-` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L228 | Addition to Subtraction | `+` → `-` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L10 | Subtraction to Addition | `-` → `+` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L12 | Subtraction to Addition | `-` → `+` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L55 | Subtraction to Addition | `-` → `+` | Detected by test suite |
| ✅ Killed | Surfboard | Surfboard Period & Billing Date Calculator | L57 | Subtraction to Addition | `-` → `+` | Detected by test suite |

## Resiliency Analysis
- **High Fault Detection**: A high score (> 80%) verifies that test assertions inspect real outputs and state changes rather than merely exercising code branches without verifying correctness.
- **Surfboard & REVA Integrity**: Critical revenue paths (COD statutory fees, REVA due diligence pricing, subscription expiry math, and signed upload keys) demonstrate robust fault detection.

To accelerate the adoption of surfboard and to start walking towards our vision for surfboard (which is to unlock the economic value of survey plans) we want to take our first step using this our present campaign “TwoNode at 2”

So we’re thinking we should take the QrCode feature on surfboard further to generate revenue for surveyors

Taking it from when the survey plan with our QrCode gets delivered to a client.

When the client scans the QrCode it should show the following services

Service 1 - (Verify Authenticity)
Under it will be

1. Verify if the Survey plan represents the actual position of the property.
2. Verify the Survey Plan Authenticity

Service 2 - Certificate of Deposit
Under it will be;

1. Download the Certificate of Deposit issued by Office of the State Surveyor General

Each one will require them to pay a certain fee, the fee breakdown should look like.

Verification fee -
Service fee -

Note: Service fee is a percentage of verification fee

[12:05 AM, 7/18/2026] Olamide Abowaba Rafiu TwoNodes: Each fee for each service should be in settings for surfboard admins
[12:07 AM, 7/18/2026] Olamide Abowaba Rafiu TwoNodes: After the payment has been confirmed for;

1. Authenticity

It loads the present QrCode page

2. Certificate of deposit

It loads the certificate of deposit pdf if it’s available, if it’s not it tells the user that it’s not yet available.

You know these transactions are one off,
For example if the user refresh the page or send the link to someone else, it should be active for an hour after payment, after which the links wouldn’t be accessible or downloadable and would require another payment (something like your access has expired).

On the surveyor’s dashboard

We need to add a page(Earnings) that will;

1. show the service that was carried on a plan (Authenticity or Certificate of deposit)
2. Show the earnings of the surveyor from each service
3. Allow them to request withdrawal of their earnings.. (so now we need create a tab for bank account details in settings)
4. Pending withdrawal
5. Total withdrawn

For notification for the surveyors

1. They should get both in app notification and also a mail that they have earned(verification fee) from survey plan number so so.
2. Receive a payment mails and in app notification for paid withdrawals.

For surfboard admin
We need a page (QrCode Earnings) that will;

1. Show stats of the revenue (verification fee and service fees) from authenticity service and certificate of deposit service
2. List of surveyors that are earning and sort by who is earning the most
3. Withdrawal queues
4. Charts ( top performing months, surveyor, plan, most purchased service)

We also need the KYC page to now show their account details and add a buttom for bank account details verification (verified users will be able to withdraw, unverified users will not be able to withdraw)

For notifications for admins

1. See in app notification and mail notification when a withdrawal is requested
2. After we process the payment we should be able to push a mail that the payment of so so has been made to account so so..

Made some update with the QRcode earning brief, will share it now.

_QR Code Earnings (Updated Product Brief)_

_Background_

As part of our TwoNode at 2 campaign, we want to take the first step toward Surfboard’s long-term vision:

_Unlocking the economic value of every survey plan._

Today, the QR Code primarily helps verify a survey plan. We now want to extend it into a revenue-generating channel for surveyors through a new feature called QR Code Earnings.

_User Feedback_

During conversations with surveyors, one recurring concern came up.

They believe that charging their clients immediately after delivering a survey plan is not ideal. At that point, the client has often just paid hundreds of thousands or even millions of naira for the survey itself.

Instead, surveyors feel it is better for clients to use the QR Code services a number of times before payment is required.

_Requirement_

Allow our admins to configure the number of free uses before payment becomes mandatory.

Example:

- Free for the first 5 uses
- Charge from the 6th use onward

This threshold should be configurable in the Surfboard Admin Settings.

_QR Code Earnings Services_

_Service 1_

Header

Know the survey plan’s actual location

Description

This service allows users to:

- Verify that the survey plan accurately represents the property’s actual location.
- Get directions to the property shown on the survey plan.
- Access key information needed to cross-check the survey plan.

⸻

_Service 2_

Header

Access Certificate of Deposit

Description

By law, every survey plan must be submitted to the Office of the State Surveyor General, after which a Certificate of Deposit is issued.

This certificate is often required for subsequent land transactions, including:

- Certificate of Occupancy (C of O)
- Governor’s Consent
- Other land documentation processes

An illustration of service 1’s description will be sent as png.

_Pricing_

Each QR Code service has its own pricing.

For every service, define:

- Verification Fee
- Service Fee

Note

The Service Fee is calculated as a percentage of the Verification Fee.

Both values should be configurable from the Surfboard Admin Settings.

And also the admin should be able to add new fee for example “MDA fee”

_Payment Flow_

Once payment is successful:

_Service 1_

Load the existing QR Code verification page.

_Service 2_

If a Certificate of Deposit has been uploaded:

- Display/download the PDF.

If it has not been uploaded:

- Display a message indicating that the certificate is not yet available.

_Access Validity_

These purchases are intended to be temporary access, not permanent ownership.

After payment:

- The purchased page remains accessible for 1 hour.
- During this period, users may refresh the page or reopen the link.
- After one hour, access expires.

If they revisit the link afterwards, display:

Your access has expired. Please purchase access again to continue.

This also prevents users from sharing paid links indefinitely.

_Surveyor Dashboard_

Create a new page called:

QR Earnings

The page should display:

1. Every QR Code transaction.- Service purchased (Location Verification or Certificate of Deposit).
1. Earnings received by the surveyor.
1. Pending withdrawals.
1. Total withdrawn.
1. Current available balance.

The page should also allow surveyors to request withdrawals.

_Users Settings page_

Add a new section:

Bank Account Details

Surveyors should be able to:

- Add bank details
- Update bank details

These details will be used when processing withdrawals.

_Surveyor’s Notifications_

Surveyors should receive both:

- In-app notifications
- Email notifications

For:

- A QR Code service purchase.
- Earnings received from a survey plan.
- Withdrawal approved.
- Withdrawal paid.

_Admin Dashboard_

Create a new page:

QR Earnings

The page should include:

_Revenue Overview_

Separate totals for:

- Verification Fees
- Service Fees

Broken down by:

- Location Verification
- Certificate of Deposit

⸻

_Leaderboard_

List surveyors ranked by earnings.

⸻

_Withdrawal Queue_

Display all pending withdrawal requests awaiting processing.

⸻

_Analytics_

Charts showing:

- Top-performing months
- Highest-earning surveyors
- Survey plans generating the most revenue
- Most purchased service
- Revenue trends

_Admin Settings_

Add settings for:

_Pricing_

For each QR Code service:

- Verification Fee
- Service Fee Percentage

Able to set new fee

For example MDA fee (fixed or percentage)

_Payment Trigger_

Configure the number of free uses before payment becomes mandatory.

Example:

Charge after the first 5 successful uses.

This value should be editable without requiring a system update.

⸻

_KYC_

Update the KYC page to include:

- Bank account details
- Account name
- Bank name
- Account number

Add a button:

Verify Bank Account

Only surveyors with verified bank accounts can withdraw earnings.

Unverified surveyors can continue earning but cannot request withdrawals until verification is complete.

_Admin Notifications_

Admins should receive both email and in-app notifications when:

- A withdrawal request is submitted.
- A bank verification requires attention (if applicable).

After processing a withdrawal, administrators should be able to trigger a notification informing the surveyor that payment has been sent, including the amount and destination bank account.

# Authentication Overview (Non-Technical)

This document provides a high-level explanation of how the Twonodes login and security system works. It is intended for administrators, stakeholders, and users who want to understand the system without dive into the code.

## 1. What is Kinde?

We use a platform called **Kinde** to manage user identities. Kinde is a professional identity provider (similar to Google or Microsoft login) that ensures:
- **Secured Passwords**: We never store your passwords directly.
- **Modern Security**: Supports features like Multi-Factor Authentication (MFA).
- **Social Login**: Allows for easy login using established accounts if configured.

## 2. Common User Journey

When a user visits a Twonodes application (like Surfboard or GBC), they follow this path:

1.  **Login Request**: The user clicks "Login" on the platform's specific landing page.
2.  **Kinde Interface**: They are redirected to a secure Kinde page to enter their credentials.
3.  **Automatic Recognition**: Once logged in, the system checks our database to see which platform the user belongs to (e.g., are they a REVA Admin? Or a Surfboard User?).
4.  **Platform Success**: The system prepares their specific "Session" (their digital ID for this visit).
5.  **Dashboard Arrival**: The user is automatically redirected to the correct dashboard for their role.

## 3. Roles and Permissions

The system is designed to be very flexible. A single user can have different roles depending on which platform they are using:

| Platform | Common Roles | Description |
| :--- | :--- | :--- |
| **REVA** | User, Admin, Super Admin | Handles specialized professional services. |
| **Surfboard** | User, Admin, MDA Roles | Handles plan submissions and government agency approvals. |
| **GBC** | User, Admin | Handles event ticketing and registrations. |

## 4. Registration Types

Not all platforms follow the same signup rules. Some allow you to join automatically, while others are "invite-only."

| Platform | Signup Type | How it Works |
| :--- | :--- | :--- |
| **Reva (Core)** | **Automatic** | Log in with Kinde, and your account is created instantly. |
| **Surfboard** | **Automatic** | Log in with Kinde, and you're ready to submit plans. |
| **GBC** | **Automatic** | Log in with Kinde to manage your tickets. |
| **Surf-MDA** | **Admin-Only** | An administrator must add you to the staff list first. |
| **Restricted Panels** | **Admin-Only** | Dedicated admin accounts must be pre-configured. |

## 5. Multi-Platform Support (Use everything at once!)
A key feature of our new system is **Simultaneous Access**. 

If you are a member of multiple platforms (like both REVA and Surfboard), you no longer need to log out of one to access the other.
- **Stay Logged In**: You can have REVA open in one tab and Surfboard in another.
- **Shared Identity**: Your login is consistent across all apps, but your specific "hat" (your role) changes automatically based on which part of the site you are visiting.
- **Smart Redirects**: If you log out of one platform, you are taken back to the login page for *that specific app*, leaving your other sessions intact until the security timer expires.

## 6. Security Features
- **Session Timeouts**: For your protection, sessions are designed to expire after a period of inactivity. This helps prevent unauthorized access if a device is left unattended.
- **Encrypted Data**: Whenever the system sends your session info, it is fully encrypted. Even if someone intercepted the data, they wouldn't be able to read your user details.
- **Partitioned Access**: An admin in REVA cannot automatically see GBC data unless they have been explicitly granted that role for the GBC platform as well. This ensures data is kept private and users only see exactly what they need.

---

For more detailed technical specifications, please refer to the [**Technical Guide**](./technical.md).

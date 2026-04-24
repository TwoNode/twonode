# Authentication & Authorization System

Welcome to the documentation for the Twonodes Authentication and Authorization system. This system is designed to handle multiple platforms (REVA, Surfboard, GBC, etc.) with a unified identity provider while maintaining granular, platform-specific session and permission logic.

## Directory Structure

This directory contains specialized documentation for different audiences:

- [**Non-Technical Overview**](./non-technical.md): A high-level guide for stakeholders, administrators, and non-developers. It explains how users log in, what roles exist, and how security is handled in plain language.
- [**Technical Guide**](./technical.md): A detailed deep-dive for developers. It covers the architecture, session encryption, middleware/proxy implementation, and the permission system.

## Core Philosophy

1. **Unified Identity**: All users authenticate through **Kinde Auth**, ensuring a secure and standardized login process.
2. **Platform Partitioning**: While identity is unified, user data and permissions are partitioned by platform (REVA, Surfboard, GBC). A user can have different roles or even different accounts across these platforms.
3. **Encrypted Sessions**: For enhanced security and flexibility, we use a custom encrypted session cookie (`USER_SESSION`) that stores platform-specific context, reducing database lookups on every request.
4. **Dynamic Redirection**: The system automatically directs users to their appropriate dashboard based on their role and the platform they are accessing.

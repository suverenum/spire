# PRD [SUV-202]: Login with Google (OAuth)

## 1. Meta Information

- **Created Date:** 2025-05-01
- **Implemented Date:** 2025-05-15
- **Ticket ID:** SUV-202
- **Branch:** feature/google-auth-login
- **[PRD](prd.example.md)**

## 2. Context

We are implementing Google Authentication to streamline user login and enhance security. This feature aims to simplify the login experience, reduce friction, and leverage Google's robust authentication mechanisms. [Link to PRD](prd.example.md)

## 3. Key Technical Drivers

- **Ease of Integration:** Minimize engineering complexity.
- **Reliability:** Ensure uptime and reliability leveraging Google's infrastructure.
- **Security:** Adhere to best practices and standards in user authentication.

## 4. Current State

Currently, users authenticate via email/password credentials managed internally. The system comprises a REST API, React front-end, Node.js backend, and PostgreSQL database.

### 4.1. Authentication Service

- Implemented in Node.js using Passport.js.
- JWT tokens for session management.

### 4.2. Frontend Login Component

- React component managing forms and API requests.

## 5. Considered Options

### 5.1. Option 1: Firebase Authentication

- **Description:** Google's managed authentication service.
- **Pros:** Fully managed, minimal backend work, strong security.
- **Cons:** Vendor lock-in, potential cost implications.

### 5.2. Option 2: Passport.js Google OAuth

- **Description:** Open-source Node.js library for OAuth.
- **Pros:** Customizable, open-source, no vendor lock-in.
- **Cons:** Requires backend work and maintenance.

### 5.3. Option 3: Auth0

- **Description:** Fully managed third-party authentication platform.
- **Pros:** Easy to integrate, supports many authentication methods, strong security.
- **Cons:** Potentially high cost at scale, limited customization.

### 5.4. Option 4: NextAuth.js

- **Description:** Authentication library for Next.js applications.
- **Pros:** Easy setup, open-source, supports multiple providers.
- **Cons:** Limited to Next.js environments, less flexibility for non-standard use cases.

### 5.5. Comparison


| Criteria            | Firebase Auth | Passport.js OAuth | Auth0 | NextAuth.js |
| ------------------- | ------------- | ----------------- | ----- | ----------- |
| Ease of Integration | ✔️            | ❌                 | ✔️    | ✔️          |
| Reliability         | ✔️            | ✔️                | ✔️    | ✔️          |
| Security            | ✔️            | ✔️                | ✔️    | ✔️          |
| Cost & Maintenance  | ❌             | ✔️                | ❌     | ✔️          |
| Flexibility         | ❌             | ✔️                | ❌     | ❌           |


**Chosen Option:** Passport.js Google OAuth

## 6. Proposed Solution

We propose using Passport.js Google OAuth for authentication, providing integration flexibility and long-term cost efficiency. This maintains our control over authentication logic while using Google's secure authentication services.

### 6.1. Backend (Node.js + Passport.js)

- Implement Google OAuth strategy using Passport.js.
- Store OAuth tokens securely.
- Update authentication logic to handle OAuth flow.

### 6.2. Frontend (React)

- Integrate OAuth login flow into existing login UI.
- Handle OAuth callbacks and session management.

### 6.3. Database (PostgreSQL)

- Add columns for storing OAuth tokens and Google account identifiers.

### 6.4. Pros and Cons

- **Pros:** Cost-effective, maintains flexibility, good security practices.
- **Cons:** Increased initial development effort and ongoing maintenance.
- **Consequences:** Slightly extended implementation timeline.

## 7. Alternatives Not Chosen

- **Firebase Authentication:** Rejected due to potential vendor lock-in and cost.
- **Auth0:** Rejected due to potentially high cost and limited customization.
- **NextAuth.js:** Rejected due to limited flexibility outside Next.js environments.

## 8. References

- [Passport.js Google OAuth documentation](https://www.passportjs.org/packages/passport-google-oauth20/)
- [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2)
- [Auth0 documentation](https://auth0.com/docs)
- [NextAuth.js documentation](https://next-auth.js.org/)


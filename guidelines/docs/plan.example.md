# PLAN [SUV-202] – Google Auth Integration

## 1. Meta Information

- **Created Date:** 2025-05-01
- **Implemented Date:** TBD
- **Ticket ID:** SUV-202
- **Branch:** feature/google-auth
- [**PRD**](prd.example.md)
- [**SPEC**](spec.example.md)

## 2. User stories

### 2.1. User story 1: Sign in with Google

As a user, I want to sign in with my Google account so that I can log in securely without creating a new password.

#### 2.1.1. Acceptance criteria

```
Given I’m on the login screen,
When I click “Continue with Google” and authenticate,
Then I should be logged in and redirected to my dashboard.

Given I’m already logged in with Google,
When I visit the app,
Then I should remain signed in.
```

#### 2.1.2. Tasks

| Name                                | Type | Estimate (hrs) |
| ----------------------------------- | ---- | -------------- |
| FE: Add Google login button         | FE   | 1.5            |
| FE: Handle Google OAuth redirect    | FE   | 2              |
| BE: Set up Passport.js Google OAuth | BE   | 2.5            |
| BE: Store Google tokens securely    | BE   | 1.5            |
| TXT: Write login button text        | TXT  | 0.5            |
| TST: Write unit tests for auth      | TST  | 2              |
| QA: Manual test login flow          | QA   | 1              |
| INFR: Create Google API credentials | INFR | 1              |

### 2.2. User story 2: Admin login visibility

As an admin, I want to see whether a user logged in via Google or email/password so that I can track login methods for audits and support.

#### 2.2.1. Acceptance criteria

```
Given a user logs in with Google,
When I view their profile in the admin panel,
Then it should show "Google" as their login method.

Given a user logs in with email/password,
When I view their profile in the admin panel,
Then it should show "Email/Password" as their login method.
```

#### 2.2.2. Tasks

| Name                                      | Type | Estimate (hrs) |
| ----------------------------------------- | ---- | -------------- |
| BE: Store login method on each login      | BE   | 1.5            |
| FE: Display login method in admin UI      | FE   | 1.5            |
| TST: Add test for login method visibility | TST  | 1              |
| QA: Test login method visibility in admin | QA   | 1              |

## 3. Roadmap

### 3.1. Critical path

- **BE: Set up Passport.js Google OAuth**: foundational logic for login.
- **INFR: Create Google API credentials**: needed before any real OAuth request can succeed.
- **FE: Handle Google OAuth redirect**: required to complete login.

### 3.2. Backlog

| #   | Type | Name                                  | Importance | Estimate (hrs) |
| --- | ---- | ------------------------------------- | ---------- | -------------- |
| 1   | INFR | Create Google API credentials         | Must       | 1              |
| 2   | BE   | Set up Passport.js Google OAuth       | Must       | 2.5            |
| 3   | BE   | Store Google tokens securely          | Must       | 1.5            |
| 4   | FE   | Add Google login button               | Must       | 1.5            |
| 5   | FE   | Handle Google OAuth redirect          | Must       | 2              |
| 6   | TXT  | Write login button text               | Should     | 0.5            |
| 7   | TST  | Write unit tests for auth             | Must       | 2              |
| 8   | QA   | Manual test login flow                | Must       | 1              |
| 9   | BE   | Store login method on each login      | Should     | 1.5            |
| 10  | FE   | Display login method in admin UI      | Should     | 1.5            |
| 11  | TST  | Add test for login method visibility  | Should     | 1              |
| 12  | QA   | Test login method visibility in admin | Should     | 1              |

## 4. Whole Project Estimate

| Type      | Total Hours |
| --------- | ----------- |
| FE        | 6.5         |
| BE        | 7           |
| TXT       | 0.5         |
| TST       | 3           |
| QA        | 2           |
| INFR      | 1           |
| **Total** | **20** hrs  |

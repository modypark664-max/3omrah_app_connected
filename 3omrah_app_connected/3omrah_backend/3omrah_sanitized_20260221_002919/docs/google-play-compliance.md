# Google Play Compliance Tracker

_Last updated: December 13, 2025_

This document captures the remaining work needed to assert that the Rehlatty mobile app and backend meet Google Play’s Developer Program Policies and User Data requirements.

## 1. Account Deletion & Data Access
- **Backend**: add an authenticated endpoint (e.g., `DELETE /api/mobile/profile`) that
  - re-verifies the user (password confirmation or recent login check),
  - deletes `User` record plus related `Reserve` entries, chat data, and `favorites`, or anonymizes them when legally required,
  - clears active sessions/cookies.
- **Mobile app**: new "Delete account" action inside `ProfileScreen` with double confirmation and a final sign-out.
- **Admin tooling** (optional but recommended): CLI or admin panel button to honor support-initiated deletions.

## 2. Privacy Policy Exposure
- Host a privacy policy document under `/privacy` (EJS view) or link to the live site if already published.
- Surfacing requirements:
  - Footer/nav link on the public site (Express `views/` templates).
  - Quick link on the mobile profile screen pointing to the same URL via `Linking.openURL`.
  - Reference the URL in `app.json` / store listing metadata.

## 3. Data Safety & Transparency
- Prepare answers for Play Consoles Data Safety form:
  - **Data types collected**: username, phone number, password (hashed), reservation details, payment preference, favorites, chat messages, analytics (if added).
  - **Processing purposes**: authentication, travel reservation fulfillment, customer support.
  - **Sharing**: currently only with in-house staff/partners via admin tools; document if third parties (e.g., email providers, SMS gateways) receive data.
  - **Retention/deletion**: spells out default retention period and user-requested deletion SLA.
- Publish the above in repo docs (see pending Section 4 once data inventory is complete) and keep it in sync with the Play Console submission.

## 4. Implementation Checklist
| Item | Owner | Status |
| --- | --- | --- |
| Build delete-account API (Express) | Backend | _todo_ |
| Wire delete action into Expo Profile screen | Mobile | _todo_ |
| Create `/privacy` page + link in navbar/footer | Backend | _todo_ |
| Add Privacy & Terms quick links in mobile UI | Mobile | _todo_ |
| Draft data inventory for Data Safety form | Product | _todo_ |
| Update Play Console Data Safety + policy attestation | Release | _todo_ |

Keep this tracker updated as features reach production so we have a single source of truth for compliance-related work.

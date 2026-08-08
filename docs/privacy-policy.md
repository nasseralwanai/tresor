# Privacy Policy — Tresor

_Last updated: August 8, 2026_

## Overview

Tresor is a private, invitation-only platform for luxury collection management. This privacy policy explains what data we collect, how we use it, and the controls you have over your information.

## 1. Data We Collect

### 1.1 Account Information
- **Phone number**: Used for authentication via SMS verification code.
- **Display name**: The name shown to circle members.
- **Profile photo**: Optional avatar image.

### 1.2 Collection Data
- **Item details**: Brand, model, category, condition, serial number, notes, and photos you upload for each piece in your collection.
- **Pricing information**: Purchase price, estimated value, and purchase date. This information is visible only to you and any co-owners of the item. It is never shown to other circle members.
- **Ownership records**: Co-ownership shares, ownership history, and custody transfers.

### 1.3 Circle Data
- **Circle membership**: Your association with one or more private circles.
- **Circle activity**: Borrow requests, lending records, and feed interactions (likes, comments, votes) within your circle.

### 1.4 Photos
- Item photos you upload are stored in a private storage bucket. Access is controlled by row-level security policies that restrict viewing to the item owner and circle members.

### 1.5 Technical Data
- Device identifiers and crash reports for troubleshooting (no third-party analytics or advertising trackers are used).

## 2. How We Use Your Data

- To authenticate your identity and manage your account.
- To display your collection and share items with your circle members.
- To track lending, borrowing, and co-ownership within your private circle.
- To provide activity feeds and notifications within your circle.
- To maintain data integrity and security through our database infrastructure.

We do **not** use your data for:
- Advertising or marketing to third parties.
- Selling or sharing data with third parties.
- Public display of any collection information.
- Training machine learning models on your personal data.

## 3. Data Sharing

### 3.1 Within Your Circle
Collection items, photos, and activity are shared exclusively with members of circles you belong to. You control what is shared through privacy toggles on each item. Items marked as private are visible only to you and co-owners.

### 3.2 No Third-Party Sharing
We do not share your personal data or collection information with any third-party services, advertising networks, or data brokers.

### 3.3 Legal Requirements
We may disclose information if required by law, court order, or legal process, though we will challenge requests that we believe are improper.

## 4. Data Retention

- **Active accounts**: Your data is retained as long as your account is active.
- **Deleted items**: When you delete an item, it is soft-deleted (marked as unavailable). Associated photos remain in storage until permanently removed.
- **Account deletion**: Upon account deletion, your profile, items, photos, and activity within your circles are permanently removed from our systems within 30 days.
- **Borrow history**: Completed borrow transactions are retained for record-keeping purposes within your circle.

## 5. Your Rights

### 5.1 Access
You can view all your personal data through the app at any time.

### 5.2 Modification
You can edit your profile, item details, and privacy settings at any time within the app.

### 5.3 Deletion
You can delete individual items, photos, or your entire account. Account deletion permanently removes all associated data.

### 5.4 Export
You may request an export of your personal data by contacting us at the email below.

### 5.5 Privacy Controls
Each item has privacy and lendability toggles. Items marked as private are never visible to circle members. Pricing information is always restricted to owners and co-owners regardless of privacy settings.

## 6. Security

- All data is transmitted over encrypted connections (TLS/SSL).
- Row-level security (RLS) policies enforce that users can only access data they are authorized to view.
- Authentication is handled via Supabase Auth with JWT-based session management.
- Storage buckets are protected by RLS policies — only item owners can upload, and only circle members can view.
- No passwords are stored (phone-based authentication only).

## 7. Children's Privacy

Tresor is rated 17+ and is not intended for users under 17 years of age. We do not knowingly collect data from minors.

## 8. Changes to This Policy

We may update this privacy policy from time to time. We will notify you of material changes through the app. Continued use after changes constitutes acceptance of the updated policy.

## 9. Contact

For privacy questions, data requests, or account deletion, contact:

**Email**: privacy@tresor.app (placeholder)

We aim to respond to all privacy inquiries within 72 hours.

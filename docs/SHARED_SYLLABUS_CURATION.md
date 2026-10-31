# Shared syllabus reference curation

## Purpose
The shared reference library is separate from each teacher's private syllabus catalogues. It is a centrally curated source of syllabus versions that authenticated users can browse. It does not silently replace or edit anyone's private catalogue.

## Access model
- Ordinary authenticated users can read only catalogues with status `verified`, including their chapters, topics and source evidence.
- Anonymous users have no table access.
- Only users listed in `public.platform_admins` can create or edit draft shared references, add citations, verify a version or retire a published version.
- Authenticated users cannot insert, update or delete their own platform-admin membership. Membership must be provisioned out of band by the project owner using the Supabase SQL editor or service role.
- The `is_platform_admin()` helper is `SECURITY INVOKER`; it does not bypass RLS.
- The application deliberately does not use user-editable metadata as an authorization claim.

## Appointing the first curator
1. Create the curator's normal account through the application's signup flow.
2. Find that account's UUID in Supabase Dashboard → Authentication → Users.
3. In the Supabase SQL editor, run this as the project owner (replace the UUID):
   ```sql
   insert into public.platform_admins (user_id)
   values ('00000000-0000-4000-8000-000000000000');
   ```
4. Ask the curator to sign out and sign back in so the application session is fresh.
5. To revoke curator access, delete that membership row in the SQL editor. Do not add a self-service admin screen.

No curator membership or sample syllabus content is seeded by migrations. This prevents a public user from inheriting a hard-coded administrator role and avoids publishing invented curriculum data.

## Publishing workflow
1. Open **Dashboard → Syllabus → Shared syllabus library → Curator workspace**.
2. Create a draft with the exact board, qualification, subject and version.
3. Record the official-board HTTPS source URL, document title and date checked. HTTPS alone does not prove that a URL belongs to an exam board; the curator must inspect the publisher and document revision.
4. Add chapters and topics in the same hierarchy used by the source specification.
5. Record an append-only source citation for every chapter and every topic. Include a page/section locator and a short supporting excerpt or curator note.
6. Use **Verify and publish** only after the source and all chapter/topic citations have been checked. The database rejects publication if the catalogue source is incomplete or any chapter/topic lacks its own citation.
7. Once verified, the catalogue identity, source provenance, chapters, topics and evidence are immutable. To correct a published specification, create a new version and retire the old one after review.

## What “verified” means
It means a platform curator recorded and reviewed the source and the required citations. It is not an automated certification by the app, a guarantee that the exam board has not subsequently changed the syllabus, or a claim that every downstream AI answer is correct. The reference detail page displays the exact source and evidence so users can inspect it themselves.

## Database protections
- RLS is enabled on all five tables in the exposed `public` schema.
- Explicit Data API grants are used because Supabase no longer automatically exposes newly created public-schema tables to the Data API.
- Draft rows are visible only to appointed curators. Ordinary users see verified rows only.
- Chapter/topic writes are allowed only while the parent catalogue is a draft.
- Source evidence is append-only.
- Verification is enforced by a database trigger, not only by the page action.
- Foreign-key indexes cover the new curator/reference relationships.

## Current state
The schema, RLS policies, curator workspace and read-only shared library are implemented. Two Cambridge O Level 2026–2028 source-indexed catalogues are now seeded as curator-only drafts: Physics 5054 (6 chapters, 63 numbered topic headings) and Chemistry 5070 (12 chapters, 49 numbered topic headings). Each chapter and topic has an append-only evidence locator pointing to its official PDF section. These drafts are not verified or visible to ordinary users. They do not include the detailed learning objectives and are not a substitute for the complete syllabuses. A real appointed curator must check every heading and the administrative-zone availability before verification/publication. Do not treat the presence of a source URL or evidence locator as independent verification.

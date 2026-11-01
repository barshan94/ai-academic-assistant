# Teacher Review Workflow

## Purpose and boundaries
The owner can share one question with an existing Academic Assistant account. An accepted teacher can read that question and its saved answer drafts, then submit an independent review event. Access is not global and does not expose the owner's full document library.

## Owner flow
1. Open a question workspace.
2. Enter the teacher's existing account email address.
3. Create the invitation.
4. Tell the teacher to sign in using that exact email address and open /dashboard/teacher-invites.
5. Review the accepted/pending state in the question workspace.
6. Revoke access from the same workspace when it is no longer needed.

## Teacher flow
1. Sign in with the exact invited account email.
2. Open Teacher invitations.
3. Accept the invitation.
4. Open the shared question.
5. Read the question and saved AI answer versions.
6. Submit either "Reviewed — acceptable as a draft" or "Needs correction" with notes.

## Access rules
- The database, not the UI, enforces invitation acceptance and question-scoped access through RLS.
- Invitation creation is owner-only.
- An invitee can accept only an invitation matching the email claim in their authenticated JWT.
- Teacher access is bound to the accepting Supabase user ID.
- Teachers cannot create new AI answers or edit the owner's question.
- Teachers can insert append-only review events for the shared question's saved answers.
- The owner can read all review events; a teacher can read their own review events.
- New invitations expire after seven days by default (the database rejects expiry windows beyond 30 days). Expiry blocks acceptance of a pending invitation; it does not silently terminate an already accepted teacher session.
- Acceptance is an atomic RPC: it locks the invitation, checks that the authenticated account has a confirmed Auth email matching the normalized invited email, rejects self-acceptance, and prevents replay or acceptance after expiry/revocation.
- Invitation creation is also atomic and serialized per owner/question/email. A still-pending unexpired invitation or an accepted, unrevoked invitation prevents duplicate invitations. Expired pending invitations do not block re-issue.
- The owner revokes access through an atomic RPC. The database locks the invitation, checks ownership and active state, and supplies the revocation timestamp; clients cannot directly mutate invite state. Revocation is a one-way transition that immediately removes question/solution access and prevents further reviews. Invitation history is retained; authenticated users cannot delete it.
- Revoked invitations can be reissued; expired pending invitations can also be reissued without deleting historical rows.

## Important limitations
- The app currently does not send invitation emails. The owner must notify the teacher separately.
- The teacher must already have an account; invitation-driven account creation is not implemented.
- Live two-account acceptance/revocation testing is still required.
- A teacher review is an authenticated human review, not an exam-board endorsement.
- An active accepted teacher can submit reviews only through the SECURITY DEFINER `record_teacher_solution_review` invoker-rights RPC wrapper. The RPC derives the reviewer from `auth.uid()`, locks the solution and invite, rejects owners/uninvited/revoked accounts, and appends the review event. An `approved` decision sets `teacher_verified`; a later `needs_correction` decision returns the status to `generated`. Direct teacher INSERT is denied. Owner reviews remain separate and cannot promote verification.
- Supabase email confirmation should remain enabled so account email claims represent verified addresses.

- This is independent human review, not official exam-board certification or an automated correctness guarantee.

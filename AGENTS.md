<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Data access goes through tenant repositories in src/services/db.ts that require a tenantId on every call; they use Firestore when VITE_FIREBASE_* env vars exist, else in-memory mock data — keeps tenant isolation in one place and lets the app run before Firebase is wired.
- Firestore security rules live in firestore.rules at the project root and must stay in sync with collection names in the repositories.

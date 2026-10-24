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

## Architecture
- All backend access goes through `src/lib/api.ts` `withFallback`, which calls FastAPI (`VITE_API_URL`) and falls back to deterministic mocks in `src/lib/mock/` — so the cloud preview always works without the backend.
- Simulation and business rules (extrapolation, guardrail, battery/grid what-if) live as pure functions in `src/lib/sim.ts` and are covered by `src/test/sunproof-rules.test.ts`.
- Severity/responsible enums are only shown through `src/lib/i18n.ts` Romanian labels; never render raw enum strings.

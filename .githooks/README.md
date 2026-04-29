# Git Hooks

## One-time activation

```bash
git config core.hooksPath .githooks
```

Run once per clone, per dev. After that, `git push origin master` / `main` will
be blocked locally. All other branches push normally.

## What's installed

- `pre-push` — blocks direct pushes to `master` / `main`. Use a feature branch
  + PR instead. Emergency bypass: `git push --no-verify`.

## Why client-side?

The SignupSol org is on GitHub Free which doesn't enable branch protection
or rulesets on private repos. Until we upgrade to Team tier, this hook is our
line of defense against accidental direct pushes to canonical branches.

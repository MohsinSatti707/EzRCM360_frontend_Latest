---
name: git_pull_before_changes
description: Always pull from remote before making any code changes in both backend and frontend repos
type: feedback
---

Before making any changes to either repo, always run:

```bash
cd "c:/Users/786al/Downloads/SignUp/EzRCM360_Backend_Latest" && git pull origin main
cd "C:/Users/786al/Downloads/SignUp/EzRCM360_frontend_Latest" && git pull origin main
```

This applies to ALL changes — code edits, new components, service updates, etc.
User explicitly asked for this after a session where stale local state caused confusion.

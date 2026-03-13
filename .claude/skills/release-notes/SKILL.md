---
name: release-notes
description: Generate release notes from recent commits since last tag or deployment
disable-model-invocation: true
---

# Release Notes

Generates a changelog from recent commits to help track what's been deployed.

## Steps

1. Find the last git tag (or use the last 10 commits if no tags exist):
   ```bash
   git describe --tags --abbrev=0 2>/dev/null || echo "no-tags"
   ```

2. Get commits since that point:
   ```bash
   # If tags exist:
   git log <last-tag>..HEAD --oneline --no-merges
   # If no tags:
   git log -10 --oneline --no-merges
   ```

3. Categorize each commit into:
   - **New Features** — commits with "add", "feat", "new"
   - **Improvements** — commits with "update", "enhance", "improve", "redesign"
   - **Bug Fixes** — commits with "fix", "patch", "resolve"
   - **Infrastructure** — commits with "ci", "deploy", "sync", "config", "automation"
   - **Other** — anything else

4. Output formatted release notes:
   ```markdown
   ## Release Notes — [date]

   ### New Features
   - [commit summary]

   ### Improvements
   - [commit summary]

   ### Bug Fixes
   - [commit summary]

   ### Infrastructure
   - [commit summary]
   ```

5. If the user wants to tag the release, suggest:
   ```bash
   git tag -a v[version] -m "Release v[version]"
   git push origin v[version]
   ```

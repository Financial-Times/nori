# update-runbook

The script finds the `runbook.md` or `RUNBOOK.md` in the repos listed in `repos.txt` and updates the team listed under the **Supported By** heading to Ops Cops, e.g.

```diff
## Supported By

- customer-products-content-discovery
+ customer-products-ops-cops

```

For each repo it then performs a `git add` and `git commit` (using a script-defined commit message).

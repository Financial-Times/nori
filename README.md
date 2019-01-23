# 🏃 transformation-runner CLI tool

> A CLI tool for applying file changes to many git repositories

This tool clones the git repositories, runs a script against each one to make the
required changes and then pushes those changes. See [Separation of concerns](#separation-of-concerns)
for more details.

Example use cases:

- Updating a configuration file in all your repositories e.g. `.gitignore`
- Replacing a deprecated dependency in multiple projects
- Automate the code changes required for a system migration

Scripts for making changes should _not_ be stored in this repository. If you find
yourself writing scripts to be run with this tool you should collect them
together in their own separate repository.

> :information_source: This project is awaiting a [new name](https://github.com/Financial-Times/transformation-runner/issues/2).

## CLI usage

```bash
npx github:Financial-Times/transformation-runner \
    /tmp/workspace \
    directory/path-to/a-transformation-script.js \
    https://github.com/organization/repository-1,https://github.com/organization/repository-2 \
    some-branch-name \
    $GITHUB_PERSONAL_ACCESS_TOKEN
```

Options to the CLI are positional:

1. Workspace path - directory that you want the git repositories cloned to.
2. Script path - executable script that you want to be run against each repository.
3. Targets - a string of one or multiple https URLs for git repositories
   (if multiple, must be comma separated).
4. Git branch name - name for the git branch that you want to be created in each
   repository.
5. GitHub personal access token - this token must have all `repo` scopes. See the
   [`git` tooling helper documentation](https://github.com/Financial-Times/tooling-helpers/blob/master/README.md#git)
   (which this CLI tool uses to work with git).

**Tip:** `mktemp` is handy for generating a temporary, throwaway directory
([documentation](https://manpages.ubuntu.com/manpages/en/man1/mktemp.1.html)).
Instead of `/tmp/workspace` in the example above, you could use `$(mktemp -d)`.

## Environment variables

When the `transformation-runner` runs a script, it makes the following environment
variables available (in addition to the ones already present in the shell that
you're executing the runner under):

- `TRANSFORMATION_RUNNER_RUNNING` - Can be used to determine if the script is
  being run by the transformation-runner (always has a value of `true`)
- `TRANSFORMATION_RUNNER_TARGET` - Full remote URL of the git repository that
  the script is being run against
- `TRANSFORMATION_RUNNER_TARGET_NAME` - The name of the git repository that the
  script is being run against

## Separation of concerns

The `transformation-runner` CLI is responsible for:

- Cloning git repositories locally ("targets")
- Creating git branches e.g. `transformation-create-heroku-pipeline`
- Running the transformation command against a repository
- Pushing the git branch to the remote `origin`

A script has the responsibility to:

- Make changes to the files in a local clone of a git repository
- Add those changes to git
- Commit those changes to git

The main benefit of this approach is that scripts do not _need_ the
`transformation-runner` for you to be able to run them. This makes development,
debugging and one-off runs of a script much simpler.

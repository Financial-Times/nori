# 🏃 transformation-runner CLI tool

This is a CLI tool for running [transformations](https://github.com/Financial-Times/transformation-runner/wiki/Transformation-Specification)
against multiple git repositories.

## What is a transformation?

You can read about what transformations are in the [Transformation Specification](https://github.com/Financial-Times/transformation-runner/wiki/Transformation-Specification).

Transformations should _not_ be stored in this repository. If you find yourself
writing transformations you should collect them together in a separate repository.

## CLI usage

TODO: Document need for `GITHUB_TOKEN` - see https://github.com/Financial-Times/next/issues/295

```bash
npx Financial-Times/transformation-runner \
    /tmp/workspace \
    path-to-your-transformations/transformation-directory \
    https://github.com/organization/repository-1,https://github.com/organization/repository-2
```

**Note:** `npx` is loading the transformation runner package from GitHub as it
is not published on `npm`.

Options to the transformation-runner CLI tool are positional:

1. Workspace - a directory where you'd like git repositories to be cloned to.
2. Transformation path - Path to a directory that contains the transformation
you want to run.
3. Targets - a string of one or multiple URLs for git repositories
(comma separated if multiple).

**Tip:** `mktemp` is handy for generating a temporary, throwaway directory
([documentation](https://manpages.ubuntu.com/manpages/en/man1/mktemp.1.html)).
Instead of `/tmp/workspace` in the example above, you could use `$(mktemp -d)`.

## Separation of concerns

The `transformation-runner` CLI is responsible for:

- Cloning git repositories locally ("targets")
- Creating git branches e.g. `transformation-create-heroku-pipeline`
- Running the transformation command against a repository
- Pushing the git branch to the remote `origin`

A transformation has the responsibility to:

- Make changes to the files in a local clone of a git repository
- Add those changes to git
- Commit those changes to git

The main benefit of this approach is that transformations do not _need_ the
transformation runner for you to be able to run them. As in most cases a
transformation will contain a script that makes changes, this script can be
run standalone. This makes development, debugging and one-off runs of a
transformation much simpler.

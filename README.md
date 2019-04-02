<h1 align="center">
  🍙 nori
</h1>

<h2 align="center">
  exploratory CLI tool to make changes across multiple repositories & track their progress
</h2>

Nori is a command-line application for managing changes across multiple (usually Github) repositories. It allows you to build up a sequence of [**Operations**](#operations) to go through the process of discovering repositories to change, cloning them & making the changes, creating Pull Requests for the changes, and tracking the progress of the Pull Requests in a Github Project. The main interface for Nori is an interactive command-line wizard, which prompts you for which operations to run, and the arguments needed for each operation.

<p align="center">
  <img src="etc/screencast.gif" alt="nori screencast" width="569" height="480">
</p>

## Usage

```sh
npx nori
```

Temporarily installs Nori and runs the interactive wizard. The wizard takes you through the steps you can run 




















---














## old readme

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

## Usage

```bash
npx github:Financial-Times/transformation-runner run-script [OPTIONS]
```

## CLI options

```
npx github:Financial-Times/transformation-runner run-script --help
transformation-runner run-script

Run a script against repositories

Options:
  --version        Show version number                                 [boolean]
  --help           Show help                                           [boolean]
  --workspace, -w  Path to a workspace directory             [string] [required]
  --script, -s     Path to a script                          [string] [required]
  --targets        Target repositories (separate multiple targets with a space)
                                                              [array] [required]
  --branch, -b     Name for the git branch to create         [string] [required]
```

**Tip:** `$(mktemp -d)` is handy for generating a temporary, throwaway directory
([documentation](https://manpages.ubuntu.com/manpages/en/man1/mktemp.1.html)).

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

<h1 align="center">
  <img alt="nori" src="etc/logo.svg" width="240"><br>

  <a href="https://npmjs.com/package/nori">
    <img alt="npm" src="https://img.shields.io/npm/v/nori.svg?color=grey&label=%20&logo=npm">
  </a>
  <a href="https://circleci.com/gh/Financial-Times/nori">
    <img alt="CircleCI" src="https://circleci.com/gh/Financial-Times/nori.svg?style=svg">
  </a>
</h1>

_exploratory command-line tool to make changes across multiple repositories & track their progress_

<blockquote><small><em>words defined by this readme are written in <strong>bold</strong></em></small></blockquote>

Nori is a command-line application for managing changes across multiple (usually Github) repositories. It allows you to build up a sequence of [**Operations**](#operations) to go through the process of discovering repositories to change, cloning them & making the changes, creating Pull Requests for the changes, and tracking the progress of the Pull Requests in a Github Project. The main interface for Nori is an interactive command-line wizard, which prompts you for which operations to run, and the arguments needed for each operation.

<p align="center">
  <img src="etc/screencast.gif" alt="nori screencast" width="569" height="480">
</p>

## Usage

```sh
npx nori
```

This temporarily installs Nori and runs the interactive wizard. The first time you run it, it will prompt you for various configuration variables, which are required only for certain operations. It'll then ask you to `Create a session`. Give the session a memorable name. The wizard takes you through the operations you can run. At any point you can exit by pressing <kbd>Ctrl</kbd>+<kbd>C</kbd> or selecting `Done`. Your progress is saved under the name you gave when you started `nori`. Next time you run it, it will display a list of previous sessions that you can resume, most recent last.

If you'll be running `nori` frequently, install it globally:

```sh
npm install -g nori
```

`nori` can run operations via the interactive prompt, or directly on the command line. Operations **output** a particular type of data, and some operations have one or more **inputs**, which are types of data that must be gathered before you can run the operation. The interactive prompt will only enable the operations you have the data for so far. When running from the command line, you can pass this data around by [**Piping**](#piping) the operations, or by using a [**State File**](#state-file).

Run `nori` with the name of the operation, and any arguments it requires as double-dashed command line arguments (`nori` understands `--kebab-case` arguments and transforms them to `camelCase`). If you're running in an interactive shell, `nori` will prompt for any missing arguments.

For example, to consume repositories from `repos.txt` and output the formatted list:

```sh
⟩ nori file --file repos.txt
https://github.com/financial-times-sandbox/Abandoned-Toothbrush
https://github.com/financial-times-sandbox/Western-Storm
```

Every operation supports the `--json` flag, which outputs all data found formatted as JSON:

```sh
⟩ nori file --file repos.txt --json
[
  {
    "owner": "financial-times-sandbox",
    "name": "Abandoned-Toothbrush"
  },
  {
    "owner": "financial-times-sandbox",
    "name": "Western-Storm"
  }
]
```

## Operations

### File

##### `nori file --file`

Get a list of repositories from a text file, structured as line-separated `owner/name` strings (optionally with leading `https://github.com/`).

<table>
  <tr>
    <th align="right">Arguments</th>
    <td><code>file</code></td>
    <td>path to the text file to read, relative to the current working directory</td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><em>none</em></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>repos</code></td>
  </tr>
</table>

### Filter repository name

##### `nori filter-repo-name --filter`

Filter the list of repositories by their names.

<table>
  <tr>
    <th align="right">Arguments</th>
    <td><code>filter</code></td>
    <td>regular expression to filter the names of the repos by</td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>repos</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>repos</code></td>
  </tr>
</table>

### Clone

##### `nori clone`

Clone each of the list of repositories

<table>
  <tr>
    <th align="right">Arguments</th>
    <td colspan="2"><em>none</em></td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>repos</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>clones</code></td>
  </tr>
</table>

### Run Script

##### `nori run-script --script --branch`

Create a branch and run a script on it. If the provided branch name already exists, Nori will append a number to it (e.g. `branch` → `branch-1`).

<table>
  <tr>
    <th align="right" rowspan="2">Arguments</th>
    <td><code>script</code></td>
    <td>path to the script to run, relative to the current working directory. should have executable permissions</td>
  </tr>
  <tr>
    <td><code>branch</code></td>
    <td>name of the branch to create</td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>clones</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>localBranches</code></td>
  </tr>
</table>

The script has the responsibility to:

- Make changes to the files in a local clone of a git repository
- Add those changes to git
- Commit those changes to git

Nori will take care of creating branches. The main benefit
of this approach is that scripts do not _need_
`nori` for you to be able to run them. This makes development,
debugging and one-off runs of a script much simpler.

### Push Branches

##### `nori push-branches`

Push each repository's local branch to the remote. If a branch already exists on the remote with the same name as the local branch, Nori will append a number to it (e.g. `branch` → `branch-1`).

<table>
  <tr>
    <th align="right">Arguments</th>
    <td colspan="2"><em>none</em></td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>clones</code>, <code>localBranches</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>remoteBranches</code></td>
  </tr>
</table>

### Pull Requests
If you are planning to raise PRs, please add your github personal access token to the githubAccessToken object in `~/.config/nori-workspace/config.json`. Authenticating increases the [secondary rate limit](https://docs.github.com/en/rest/guides/best-practices-for-integrators#dealing-with-secondary-rate-limits) of GitHub API, which increases your chance to raise multiple PRs without being blocked by the limit.

##### `nori prs --templates.title --templates.body`

Create a Pull Request for each of the pushed branches.

<table>
  <tr>
    <th align="right" rowspan="2">Arguments</th>
    <td><code>templates.title</code></td>
    <td>the title of the pull requests. you can use Javascript <code>${}</code> template string syntax. available variables are <code>repo.owner</code>, <code>repo.name</code> and <code>branch</code>.</td>
  </tr>
  <tr>
    <td><code>templates.body</code></td>
    <td>the body of the pull requests. supports templates like <code>title</code></td>
  </tr>
  <tr>
    <th align="right">Configuration</th>
    <td><code>githubAccessToken</code></td>
    <td>
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with <code>repo</code> scope</a>
    </td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>repos</code>, <code>branches</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>prs</code></td>
  </tr>
</table>

### Create Project

##### `nori create-project --project-data.name --project-data.org`

Create a Github Project.

<table>
  <tr>
    <th align="right" rowspan="2">Arguments</th>
    <td><code>projectData.name</code></td>
    <td>the name of the project to create</td>
  </tr>
  <tr>
    <td><code>projectData.org</code></td>
    <td>the org to create the project in. this must be the same org as every repo that you've created a PR on.</td>
  </tr>
  <tr>
    <th align="right">Configuration</th>
    <td><code>githubAccessToken</code></td>
    <td>
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with <code>repo</code> scope</a>
    </td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><em>none</em></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>project</code></td>
  </tr>
</table>

**NB** _we're considering what to do about repos from multiple orgs, see [#62](https://github.com/Financial-Times/nori/issue/62)_

**NB** _the project will have `To Do`, `In Progress` and `Done` columns, but there's currently no way to set up automatic transitions using the Github API. you'll have to set that up manually if you want the project board to reflect the state of the PRs_

### Get Project

##### `nori get-project --project-url`

Get a project from Github.

<table>
  <tr>
    <th align="right">Arguments</th>
    <td><code>projectUrl</code></td>
    <td>URL of the Github project page</td>
  </tr>
  <tr>
    <th align="right">Configuration</th>
    <td><code>githubAccessToken</code></td>
    <td>
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with <code>repo</code> scope</a>
    </td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><em>none</em></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>project</code></td>
  </tr>
</table>

### Add to Project

##### `nori add-to-project`

Add the [PRs](#pull-requests) to the project.

<table>
  <tr>
    <th align="right">Arguments</th>
    <td colspan="2"><em>noned</em></td>
  </tr>
  <tr>
    <th align="right">Configuration</th>
    <td><code>githubAccessToken</code></td>
    <td>
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with <code>repo</code> scope</a>
    </td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>prs</code>, <code>project</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>cards</code></td>
  </tr>
</table>

## State Files

When running the interactive prompt, your progress is automatically saved to a state file. It contains the list of operations you've run & the arguments given to them, and a cache of the data returned by the operations.

State files are kept in the folder `~/.config/nori-workspace` (this is also where repositories are cloned to). When you start the interactive prompt, it will list any state files already in the workspace folder, allowing you to resume previous sessions.

Individual operations can also read and save to state files with the `--state-file path/to/file.json` option. When you run an operation with a path to a state file that doesn't exist, it will ask if you want to create it. When the operation completes, it'll have added itself and the data it returned to the state file.

The `--state-file` option can also be used with the interactive prompt, which will skip the step asking you to create a state file or use one from the `nori` workspace folder, and allow you to use a state file from any location. State files are compatible between individual operations and the interactive prompt, which lets you shuffle between the two modes.

## Piping

State can also be passed between operations using shell pipes. This is equivalent to running them in sequence and reusing the same state file.

```sh
nori file --file repos.txt | nori run-script --script script.sh --branch change
```

Note that interactive features, such as prompting for missing arguments, won't be available when piping. If any arguments are missing, the operation will error instead. The same goes for providing a state file via the command line argument; it's an error to use `--state-file` and pipe as well. To load or save a state file in a piped operation, use [shell redirection](https://www.tldp.org/LDP/abs/html/io-redirection.html):

```sh
nori file --file repos.txt < input-state.json | nori run-script --script script.sh --branch change > output-state.json
#                         └─────────┬────────┘                                                    └─────────┬─────────┘
#                    read input from input-state.json                                        write output to output-state.json
```

## Licence

MIT. &copy; 2019 Financial Times. Made with :green_heart: by FT.com Enabling Technologies Group

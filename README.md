<table>
  <tr></tr>
  <tr>
    <th>
      <h1>
        🍙 nori
      </h1>
    </th>
    <td>
      exploratory CLI tool to make changes across multiple repositories & track their progress<br>
      <a href="https://circleci.com/gh/Financial-Times/transformation-runner">
        <img alt="CircleCI" src="https://circleci.com/gh/Financial-Times/nori.svg?style=svg">
      </a>
    </td>
  </tr>
</table>

Nori is a command-line application for managing changes across multiple (usually Github) repositories. It allows you to build up a sequence of [**Operations**](#operations) to go through the process of discovering repositories to change, cloning them & making the changes, creating Pull Requests for the changes, and tracking the progress of the Pull Requests in a Github Project. The main interface for Nori is an interactive command-line wizard, which prompts you for which operations to run, and the arguments needed for each operation.

<p align="center">
  <img src="etc/screencast.gif" alt="nori screencast" width="569" height="480">
</p>

## Usage

```sh
npx nori
```

This temporarily installs Nori and runs the interactive wizard. The first time you run it, it will prompt you for various [configuration variables](#configuration), which are required only for certain operations. It'll then ask you to `Create a session`. Give the session a memorable name. The wizard takes you through the operations you can run. At any point you can exit by pressing <kbd>Ctrl</kbd>+<kbd>C</kbd> or selecting `Done`. Your progress is saved under the name you gave when you started `nori`. Next time you run it, it will display a list of previous sessions that you can resume, most recent last.

If you'll be running `nori` frequently, install it globally:

```sh
npm install -g nori
```

`nori` can run operations via the interactive prompt, or directly on the command line. Operations **output** a particular type of data, and some operations have one or more **inputs**, which are types of data that must be gathered before you can run the operation. The interactive prompt will only enable the operations you have the data for so far. When running from the command line, you can pass this data around by piping the commands, or by using a [**State File**](#state-file).

Run `nori` with the name of the operation, and any arguments it requires as double-dashed command line arguments (`nori` understands `--kebab-case` arguments and transforms them to `camelCase`). If you're running in an interactive shell, `nori` will prompt for any missing arguments.

For example, to consume repositories from `repos.txt` and output the formatted list:

```sh
⟩ nori file --file repos.txt
https://github.com/financial-times-sandbox/Abandoned-Toothbrush
https://github.com/financial-times-sandbox/Western-Storm
```

Every command supports the `--json` flag, which outputs all data found formatted as JSON:

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
### Tako 
##### `nori tako [--topic]`

Get a list of repositories from a [Tako](https://github.com/financial-times/tako) instance.

<table>
  <tr>
    <th align="right">Arguments</th>
    <td><code>topic</code></td>
    <td>(optional) Github topic to filter the repositories by</td>
  </tr>
  <tr>
    <th align="right" rowspan="2">Configuration</th>
    <td><code>takoHost</code></td>
    <td>hostname of the Tako instance</td>
  </tr>
  <tr>
    <td><code>takoToken</code></td>
    <td>bearer token header to send to your Tako instance</td>
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

### File
##### `nori file --file`

Get a list of repositories from a text file, structured as line-separated `owner/name` strings (optionally with leading `https://github.com/).

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

### Run Script
##### `nori run-script --script --branch`

Clone each of the list of repositories, create a branch, run a script on that branch, then push the branch to the remote.

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
    <td colspan="2"><code>repos</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>branches</code></td>
  </tr>
</table>

**NB** *this operation will be split into multiple operations. it's doing too much right now*

The script has the responsibility to:

- Make changes to the files in a local clone of a git repository
- Add those changes to git
- Commit those changes to git

Nori will take care of:

- Cloning the repos
- Creating branches
- Pushing branches

The main benefit of this approach is that scripts do not _need_ the
`transformation-runner` for you to be able to run them. This makes development,
debugging and one-off runs of a script much simpler.

### Pull Requests
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
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with `repo` scope</a>
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

### Project
##### `nori project --project-data.name --project-data.org`

Create a Github Project, and add all created Pull Requests to it.

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
      Github <a href="https://github.com/settings/tokens/new?scopes=repo&description=Nori" target="_blank">personal access token with `repo` scope</a>
    </td>
  </tr>
  <tr>
    <th align="right">Inputs</th>
    <td colspan="2"><code>prs</code></td>
  </tr>
  <tr>
    <th align="right">Output</th>
    <td colspan="2"><code>project</code></td>
  </tr>
</table>

**NB** *we're considering what to do about repos from multiple orgs, see [#62](https://github.com/Financial-Times/nori/issue/62)*

**NB** *the project will have `To Do`, `In Progress` and `Done` columns, but there's currently no way to set up automatic transitions using the Github API. you'll have to set that up manually if you want the project board to reflect the state of the PRs*

## State Files

When running the interactive prompt, your progress is automatically saved to a state file. It contains the list of operations you've run & the arguments given to them, and a cache of the data returned by the operations.

State files are kept in the folder `~/.config/nori-workspace` (this is also where repositories are cloned to). When you start the interactive prompt, it will list any state files already in the workspace folder, allowing you to resume previous sessions.

Individual commands can also read and save to state files with the `--state-file` option. When you
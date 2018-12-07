# transformation-runner

> A CLI tool for running transformations.

## Usage of the transformation-runner

```bash
npx Financial-Times/transformation-runner \
    workspace-directory-where-repositories-will-be-cloned/ \
    path-to/transformation-directory \
    https://url-to-git-repository.com/
```

Options to the transformation-runner CLI tool are positional:

1. Workspace directory where git repositories should be cloned to.
2. Path to the directory that contains the transformation you want to run.
3. Targets - a string of one or multiple URLs for git repositories
(comma separated if multiple).

e.g.

```bash
npx Financial-Times/transformation-runner \
    $(mktemp -d) \
    transformations/add-new-dependency \
    https://github.com/organization/repsitory-1,https://github.com/organization/repsitory-2
```

**Tip:** `mktemp` is handy for generating a temporary, throwaway directory
([documentation](https://manpages.ubuntu.com/manpages/en/man1/mktemp.1.html)).

## What is a transformation?

At its simplest, a transformation is a directory that contains an `index.js`
file. This `index.js` file must export a configuration object that meets the
transformation configuration specification (see below).

Here is a basic transformation configuration example:

```javascript
module.exports = {
    name: 'Pin node to v8.13.0',
    // Use `sed` to change the value of the `engines.node` field in `package.json`
    // Commit the changes to `package.json`
    command: `sed -i 's/"node": ".+"/"node": "8.13.0"/g' package.json && git commit -am "Pin node to 8.13.0"`
};
```

## Separation of concerns

transformation-runner CLI responsibilities:

- Clone git repositories ("targets")
- Creates git branches e.g. transformation-create-heroku-pipeline
- Run the transformation against a repository
- Pushes git branches

Transformations have the responsibility to:

- Make changes to the files in a git repository
- Add those changes to git
- Commit those changes to git

## Transformation specification

This CLI expects a transformation to meet the following requirements:

- It must be a directory
- It must contain an `index.js` file which exports a valid configuration

## Configuration

Required fields:

## `name`

A friendly name for the transformation e.g. "Pin to node 8.13.0".

## `command`

The command to be run by the transformation-runner. This can be the path to
an executable script that is in the transformation directory, or it can just be
a shell command that uses system programs e.g. `sed`.

### Example of an executable script

`script.js`

```javascript
#!/usr/bin/env node

// ^^ This is a shebang. See: https://bash.cyberciti.biz/guide/Shebang

console.log(`The current working directory is ${process.cwd()}`);
```

The file that contains this script (`script.js`) must be executable e.g.

```sh
# Show script permissions
ls -l script.js

# -rw-rw-r-- 1 username username 988 Dec  5 18:58 script.js

# Make the script executable for all users
chmod +x script.js

# Show script permissions
ls -l script.js

# -rwxrwxr-x 1 username username 988 Dec  5 18:58 script.js
```

See [`chmod` documentation](https://manpages.ubuntu.com/manpages/en/man1/chmod.1.html)
for more information.

## Proposed fields (not yet implemented)

- `gitBranchName` - override the default branch name generated and used by the
the transformation-runner when creating a git branch.

  > Default is `transformation-<transformation_directory_name>`

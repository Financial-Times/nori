#!/usr/bin/env node

const {prompt} = require('enquirer');
const isUrl = require('is-url');
const got = require('got');
const {handler: runScript} = require('./run-script');
const fs = require('fs');
const util = require('util');
const path = require('path');

const oldConsoleError = console.error;
console.error = () => {};
const github = require('@financial-times/github')({
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
});
console.error = oldConsoleError;

const exists = (...args) => util.promisify(fs.access)(...args).then(() => true, () => false);
const readFile = (...args) => util.promisify(fs.readFile)(...args);
const writeFile = (...args) => util.promisify(fs.writeFile)(...args);
const readdir = (...args) => util.promisify(fs.readdir)(...args);

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

/*TODO
- undo
- full replay
- split into commands & refactor
- ebi
- noop scripts
- richer previews
- messaging & help
- sorting & editing list of replays
*/

/**
 * yargs builder function.
 *
 * @param {import('yargs/yargs').Yargs} yargs - Instance of yargs
 */
const builder = () => {};

const shortPreviews = [
    ({repos}) => repos ? `${repos.length} repositor${repos.length > 1 ? 'ies' : 'y'}` : false,
    ({branches}) => branches ? `${branches.length} branch${branches.length > 1 ? 'es' : ''}` : false,
    ({prs}) => prs ? `${prs.length} pull request${prs.length > 1 ? 's' : ''}` : false,
    ({project}) => project ? project.html_url : false,
];

const operations = [
    {
        name: 'tako',
        message: 'get a list of repos from a tako instance',
        input: 'start',
        output: 'repos',
        prompt: () => prompt([{
            name: 'url',
            validate: input => isUrl(input) || 'Please enter a valid URL',
            type: 'text',
        }, {
            name: 'token',
            type: 'text',
        }, {
            name: 'topic',
            type: 'text',
        }]),
        get: async ({url, token, topic}) => {
            return (await got(url, {
                json: true,
                headers: token && {
                    authorization: `Bearer ${token}`
                },
                query: {topic}
            })).body.repositories
        }
    },
    {
        name: 'file',
        message: 'get a list of repos from a file',
        input: 'start',
        output: 'repos',
        prompt: () => prompt({
            name: 'file',
            type: 'text',
            validate: async input => (await exists(path.resolve(input))) || 'Please enter a path to a text file containing a line-separated list of repositories'
        }),
        get: async ({file}) => {
            const contents = await readFile(file, 'utf8');
            return contents.split('\n').map(line => {
                if(!line) return;

                const [owner, name] = line.split('/');
                return {owner, name};
            }).filter(Boolean);
        }
    },
    /* { // ebi isn't yet usable outside of the CLI
        name: 'ebi',
        input: 'repos',
        output: 'repos',
        prompt: () => prompt([{
            name: 'type',
            type: 'select',
            choices: Object.keys(ebi),
        }, {
            name: 'query',
            type: 'text',
        }]),
        get: ({type, query}, {repos}) => {
            const ebiCommand = ebi[type];
            const yargs = ebiCommand.builder(subYargs(query.split(/ +/)));
            console.log(yargs.argv);
            return repos;
        },
    }, */
    {
        name: 'run-script',
        input: 'repos',
        output: 'branches',
        prompt: () => prompt({
            type: 'form',
            name: 'script',
            choices: [
                {name: 'script'},
                {name: 'branch'},
            ]
        }),
        get: ({script}, {repos}) => {
            return runScript(Object.assign({
                targets: repos.map(({name, owner}) => `git@github.com:${owner}/${name}`)
            }, script));
        },
    },
    {
        name: 'prs',
        input: 'branches',
        output: 'prs',
        prompt: () => prompt({
            type: 'form',
            name: 'templates',
            choices: [
                {name: 'title'},
                {name: 'body'},
            ]
        }),
        get: ({templates: {title, body}}, {repos, branches}) => {
            const titleTemplate = new Function('repo', 'branch', `return \`${title}\``);
            const bodyTemplate = new Function('repo', 'branch', `return \`${body}\``);

            // TODO what if not all the repos had a branch created
            return Promise.all(branches.map((branch, index) => {
                const repo = repos[index];
                return github.createPullRequest({
                    owner: repo.owner,
                    repo: repo.name,
                    head: branch,
                    base: 'master',
                    title: titleTemplate(repo, branch),
                    body: bodyTemplate(repo, branch)
                })
            }))
        },
    },
    {
        name: 'project',
        input: 'prs',
        output: 'project',
        prompt: () => prompt({
            name: 'projectData',
            type: 'form',
            choices: [
                {name: 'name'},
                {name: 'org'}
            ]
        }),
        get: async ({projectData}, {prs}) => {
            const project = await github.createProject(projectData);
            const todoColumn = await github.createProjectColumn({project_id: project.id, name: 'To do'});
            await github.createProjectColumn({project_id: project.id, name: 'In progress'});
            await github.createProjectColumn({project_id: project.id, name: 'Done'});

            await Promise.all(
                prs.map(pr => github.createPullRequestCard({
                    column_id: todoColumn.id,
                    content_id: pr.id,
                    content_type: 'PullRequest'
                }))
            );

            return project;
        },
    },
    {
        name: 'preview',
        input: false,
        output: false,
        prompt: () => {},
        get: (_, data) => console.log(data),
    },
    {
        name: 'done',
        input: false,
        output: 'done',
        prompt: () => prompt({}),
        get: () => {},
    }
];

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.workspace
 * @param {string} argv.script
 * @param {string} argv.targets
 * @param {string} argv.branch
 */
const handler = async () => {
    let type = 'start';
    let steps = [];
    let data = {};
    let resume = 'new';
    let run

    const previousRuns = (await readdir(workspacePath)).filter(
        file => file.endsWith('.json')
    );

    if(previousRuns.length) {
        ({resume} = await prompt({
            name: 'resume',
            type: 'select',
            choices: previousRuns.concat(
                {name: 'new'}
            ),
        }));
    }

    if(resume === 'new') {
        const {name} = await prompt({
            name: 'name',
            type: 'text',
        });

        run = path.join(workspacePath, name + '.json');
    } else {
        run = path.join(workspacePath, resume);
        ({steps, data, type} = JSON.parse(
            await readFile(run, 'utf8')
        ));
    }

    while(type !== 'done') {
        const header = shortPreviews.map(format => format(data)).filter(Boolean).join(' ∙ ');
        const {thing} = await prompt({
            name: 'thing',
            message: 'what do',
            type: 'select',
            header,
            choices: operations.map(({name, message, input}) => ({
                name,
                message,
                disabled: (!input || input === type) ? false : ''
            })),
        });

        const choice = operations.find(({name}) => name === thing);
        const payload = await choice.prompt();
        const stepData = await choice.get(payload, data);

        if(choice.output) {
            steps.push({name: thing, payload});
            type = choice.output;
            data[type] = stepData;
        }

        if(type !== 'done') {
            await writeFile(
                run,
                JSON.stringify({steps, data, type}, null, 2)
            );
        }
    }
};

/**
 * @see https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
module.exports = {
	command: ['*', 'interactive'],
	desc: 'Interactively build steps of a transformation',
	builder,
	handler,
};

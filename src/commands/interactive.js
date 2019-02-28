#!/usr/bin/env node

const {prompt} = require('enquirer');
const isUrl = require('is-url');
const got = require('got');
const {handler: runScript} = require('./run-script');
const fs = require('fs');
const util = require('util');
const path = require('path');

const exists = (...args) => util.promisify(fs.access)(...args).then(() => true, () => false);
const readFile = (...args) => util.promisify(fs.readFile)(...args);
const writeFile = (...args) => util.promisify(fs.writeFile)(...args);
const readdir = (...args) => util.promisify(fs.readdir)(...args);

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

/**
 * yargs builder function.
 *
 * @param {import('yargs/yargs').Yargs} yargs - Instance of yargs
 */
const builder = () => {};

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
                const [owner, name] = line.split('/');
                return {owner, name};
            });
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
        prompt: () => prompt({}),
        get: () => {},
    },
    {
        name: 'project',
        input: 'prs',
        output: 'project',
        prompt: () => prompt({}),
        get: () => {},
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
        const {thing} = await prompt({
            name: 'thing',
            message: 'what do',
            type: 'select',
            choices: operations.map(({name, message, input}) => ({
                name,
                message,
                disabled: (!input || input === type) ? false : ''
            })),
        });

        const choice = operations.find(({name}) => name === thing);
        type = choice.output;

        const payload = await choice.prompt();
        steps.push({name: thing, payload});
        
        data[type] = await choice.get(payload, data);

        if(type !== 'done') {
            await writeFile(
                run,
                JSON.stringify({steps, data, type}, null, 2)
            );
        }
    }

    console.log(steps, data);
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

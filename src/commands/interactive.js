#!/usr/bin/env node

const {prompt} = require('enquirer');
const isUrl = require('is-url');
const got = require('got');

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
        }]),
        get: async ({url, token}) => {
            return (await got(url, {
                json: true,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })).body.repositories
        }
    },
    {
        name: 'ebi',
        input: 'repos',
        output: 'repos',
        prompt: () => prompt({
            name: 'query',
            type: 'text'
        }),
        get: () => {},
    },
    {
        name: 'run-script',
        input: 'repos',
        output: 'branches',
        prompt: () => prompt({}),
        get: () => {},
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
        output: false,
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
    const steps = [];
    const data = {};

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
        steps.push({type, payload});
        
        data[type] = await choice.get(payload, data);
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

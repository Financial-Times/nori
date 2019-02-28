#!/usr/bin/env node

const {prompt} = require('enquirer');

/**
 * yargs builder function.
 *
 * @param {import('yargs/yargs').Yargs} yargs - Instance of yargs
 */
const builder = () => {};

const operations = [
    {
        name: 'tako',
        input: 'start',
        output: 'repos',
        prompt: () => prompt({}),
        get: () => {}
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
            choices: operations.map(({name, input}) => ({
                name,
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

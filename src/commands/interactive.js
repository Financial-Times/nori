#!/usr/bin/env node

const {prompt} = require('enquirer');
const isUrl = require('is-url');
const got = require('got');
const {handler: runScript} = require('./run-script');
const fs = require('mz/fs');
const util = require('util');
const path = require('path');
const relativeDate = require('tiny-relative-date');
const toSentence = require('array-to-sentence');

const github = require('@financial-times/github')({
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
});

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

/*TODO
- undo
- full replay
- noop scripts
- richer previews
- messaging & help
- open in browser (multiple input types?)
- better form field ux
- better logging for async tasks
- ebi
- toposort operations by input & output
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
    require('./tako'),
    require('./file'),
    // require('./ebi'), // ebi isn't yet usable outside of the CLI
    require('./run-script'),
    require('./prs'),
    require('./project'),
];

async function getResume() {
    let type = 'start';
    let steps = [];
    let data = {};
    let resume = 'new';
    let run;

    const previousRuns = (await fs.readdir(workspacePath)).filter(
        file => file.endsWith('.json')
    );

    const mtimes = await Promise.all(
        previousRuns.map(run =>
            fs.stat(
                path.join(workspacePath, run)
            ).then(stat => stat.mtime)
        )
    );

    const sortedRuns = previousRuns.map(
        (run, index) => ({run, modified: mtimes[index]})
    ).sort(
        ({modified: a}, {modified: b}) => b - a
    );

    if(previousRuns.length) {
        ({resume} = await prompt({
            name: 'resume',
            type: 'select',
            choices: sortedRuns.map(
                ({run, modified}) => `${run} (${relativeDate(modified)})`
            ).concat(
                {role: 'separator'},
                {name: 'edit'},
                {name: 'new'}
            ),
        }));
    }

    if(resume === 'edit') {
        const {toDelete, confirm} = await prompt([{
            type: 'multiselect',
            name: 'toDelete',
            choices: sortedRuns.map(({run}) => run)
        }, {
            type: 'confirm',
            name: 'confirm',
            message: ({answers: {toDelete}}) => `delete ${toSentence(toDelete)}`,
            skip() {
                // should be first argument to skip, see https://github.com/enquirer/enquirer/issues/105
                return this.state.answers.toDelete.length === 0;
            } 
        }]);

        if(confirm) {
            await Promise.all(
                toDelete.map(
                    run => fs.unlink(
                        path.join(workspacePath, run)
                    )
                )
            );
        }

        return getResume();
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

    return {run, type, steps, data};
}

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
    const {run, type, steps, data} = await getResume();

    while(true) {
        const header = shortPreviews.map(format => format(data)).filter(Boolean).join(' ∙ ');
        const {thing} = await prompt({
            name: 'thing',
            message: 'what do',
            type: 'select',
            header,
            choices: operations.map(({command, desc, input}) => ({
                name: command,
                message: desc,
                disabled: (!input || input === type) ? false : ''
            })).concat([
                {role: 'separator'},
                {name: 'preview'},
                {name: 'done', hint: `your work is autosaved as ${path.basename(run)}`}
            ]),
        });

        if(thing === 'done') {
            break;
        } else if(thing === 'preview') {
            console.log(data);
        } else {
            const choice = operations.find(({command}) => command === thing);
            const payload = await choice.prompt();
            const stepData = await choice.get(payload, data);

            if(choice.output) {
                steps.push({name: thing, payload});
                type = choice.output;
                data[type] = stepData;
            }

            await fs.writeFile(
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

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
- support non-github hosts in repo object???
- think about naming of types
- pushing branch as separate step?
- reuse stateFile code for interactive?
*/

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
                ({run, modified}) => ({
                    name: run,
                    message: `${run} (${relativeDate(modified)})`,
                })
            ).concat(
                {role: 'separator'},
                {name: 'new'},
                {name: 'edit'},
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
        ({steps, data} = JSON.parse(
            await fs.readFile(run, 'utf8')
        ));
    }

    return {run, steps, data};
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
    const {run, steps, data} = await getResume();

    while(true) {
        const header = shortPreviews.map(format => format(data)).filter(Boolean).join(' ∙ ');
        const {thing} = await prompt({
            name: 'thing',
            message: 'what do',
            type: 'select',
            header,
            choices: operations.map(({command, desc, input, output}) => {
                const dataHasInputs = input.every(type => type in data);
                const dataHasOutput = output in data;
                const isFilter = input.includes(output);

                // allow an operation if the data has all the inputs and the data doesn't
                // have the output (i.e. this operation hasn't already been run) *unless*
                // the operation has the same output as one of the inputs (i.e. it can be
                // run multiple times on the same data)
                const shouldAllowOperation = dataHasInputs && (!dataHasOutput || isFilter);

                return {
                    name: command,
                    message: desc,
                    disabled: shouldAllowOperation ? false : '', // empty string to hide "(disabled)" message
                };
            }).concat([
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
            const args = await prompt(choice.arguments);
            const dataArgs = choice.input.reduce(
                (args, type) => Object.assign(args, {
                    [type]: data[type]
                }),
                {}
            );
            const stepData = await choice.handler(
                Object.assign(dataArgs, args)
            );

            if(choice.output) {
                steps.push({name: thing, args});
                data[choice.output] = stepData;
            }

            await fs.writeFile(
                run,
                JSON.stringify({steps, data}, null, 2)
            );
        }
    }
};

module.exports = {
	command: ['*', 'interactive'],
	desc: 'interactively build steps of a transformation',
	handler,
};

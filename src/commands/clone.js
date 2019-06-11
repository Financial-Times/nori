const fs = require('mz/fs')
const path = require('path')
const git = require('@financial-times/git')
const rmfr = require('rmfr')

const { workspacePath } = require('../lib/constants')

exports.handler = async (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			const cloneDirectory = path.join(workspacePath, repo.name)
			const remoteUrl = `git@github.com:${repo.owner}/${repo.name}.git`

			if (await fs.exists(cloneDirectory)) {
				await git.checkoutBranch({
					name: 'master',
					workingDirectory: cloneDirectory,
				})
			} else {
				await git.clone({
					origin: 'origin',
					repo: remoteUrl,
					workingDirectory: cloneDirectory,
				})
			}

			repo.clone = cloneDirectory
		}),
	)

exports.undo = (_, state) => {
	Promise.all(
		state.repos.map(async repo => {
			// i say we take off and nuke the whole site from orbit. it's the only way to be sure
			await rmfr(repo.clone)
			delete repo.clone
		}),
	)
}

exports.command = 'clone'
exports.desc = 'clone repositories'
exports.input = ['repos']
exports.output = 'clones'
exports.args = []

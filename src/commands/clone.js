const fs = require('mz/fs')
const path = require('path')
const git = require('@financial-times/git')
const rmfr = require('rmfr')

const { workspacePath } = require('../lib/constants')
const logger = require('../lib/logger')

exports.handler = async (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			const repoLabel = `${repo.owner}/${repo.name}`
			const cloneDirectory = path.join(workspacePath, repo.owner, repo.name)
			const remoteUrl = `git@github.com:${repoLabel}.git`

			if (await fs.exists(cloneDirectory)) {
				await git.checkoutBranch({
					name: 'master',
					workingDirectory: cloneDirectory,
				})
			} else {
				try {
					logger.log(repoLabel, { message: `cloning ${repoLabel}` })
					await git.clone({
						origin: 'origin',
						repository: remoteUrl,
						directory: cloneDirectory,
					})
					logger.log(repoLabel, {
						status: 'done',
						message: `cloned ${repoLabel}`,
					})
				} catch (error) {
					logger.log(repoLabel, {
						status: 'fail',
						message: `error cloning ${repoLabel}`,
						error,
					})
				}
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

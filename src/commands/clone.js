const fs = require('mz/fs')
const path = require('path')
const git = require('@financial-times/git')
const rmfr = require('rmfr')
const promiseAllErrors = require('../lib/promise-all-errors')

const { workspacePath } = require('../lib/constants')
const logger = require('../lib/logger')
const styles = require('../lib/styles')

exports.handler = async (_, state) =>
	promiseAllErrors(
		state.repos.map(async repo => {
			const repoLabel = `${repo.owner}/${repo.name}`
			const cloneDirectory = path.join(workspacePath, repo.owner, repo.name)
			const remoteUrl = `git@github.com:${repoLabel}.git`
			repo.centralBranch = await git.getCentralBranch({ remoteUrl })

			if (await fs.exists(cloneDirectory)) {
				await git.checkoutBranch({
					name: repo.centralBranch,
					workingDirectory: cloneDirectory,
				})
			} else {
				await logger.logPromise(
					git.clone({
						origin: 'origin',
						repository: remoteUrl,
						directory: cloneDirectory,
					}),
					`cloning ${styles.repo(repoLabel)}`,
				)
			}

			repo.clone = cloneDirectory
		}),
	)

exports.undo = (_, state) =>
	promiseAllErrors(
		state.repos.map(async repo => {
			// i say we take off and nuke the whole site from orbit. it's the only way to be sure
			if (repo.clone) {
				await rmfr(repo.clone)
			}
			delete repo.clone
		}),
	)

exports.command = 'clone'
exports.desc = 'clone repositories'
exports.input = ['repos']
exports.output = 'clones'
exports.args = []

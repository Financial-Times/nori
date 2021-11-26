module.exports = (existing, wanted) => {
	const wantedRegex = new RegExp(`^${wanted}(?:-(\\d+))?$`)

	const matching = existing
		.map((wantedName) => wantedName.match(wantedRegex))
		.filter(Boolean)

	const highestNumberedMatch = matching.reduce(
		(highest, wantedMatch) =>
			wantedMatch[1] > highest[1] ? wantedMatch : highest,
		[null, false],
	)

	const highestNumber = parseInt(highestNumberedMatch[1] || 0, 10)

	return matching.length > 0 ? `${wanted}-${highestNumber + 1}` : wanted
}

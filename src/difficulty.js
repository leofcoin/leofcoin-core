/**
 * Get hash difficulty
 *
 * @param hash
 * @return {Number}
 */
export default hash => {
	return parseInt(hash.substring(0, 8), 16);
};

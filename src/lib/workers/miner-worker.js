import calculateHash from './../dagchain/calculate-hash';
import getDifficulty from '../../difficulty';

const hashes = nonce => {
	const hashrates = [10000];
	for (let i = hashrates.length; i-- > 0;) {
		if (nonce % hashrates[i - 1] === 0) return hashrates[i - 1];
	}
	return hashrates.filter(hashrate => {
		if (nonce % hashrate === 0) return hashrate;
	});
};

export default (() => {
	process.on('message', async ({block, difficulty}) => {
  	const stop = () => resolve(null);
  	let hashCount = 0;
		block.hash = await calculateHash(block);
  	while (getDifficulty(block.hash) >= difficulty) {
  		block.nonce++;
  		block.hash = await calculateHash(block);
  		hashCount = hashCount + Number(hashes(block.nonce));
  	}
  	process.send({ block, hashCount });
	});

})();

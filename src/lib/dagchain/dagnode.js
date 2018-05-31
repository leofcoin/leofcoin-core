import { DAGNode } from 'ipld-dag-pb';

export default ({index, prevHash, time, transactions, nonce}) => {
	return new Promise((resolve, reject) => {
		DAGNode.create(JSON.stringify({
			index,
			prevHash,
			time,
			transactions,
			nonce
		}), [], 'sha2-256', (error, dagNode) => {
			if (error) {
				return reject(error);
			}
			return resolve(dagNode);
		});
	});
};

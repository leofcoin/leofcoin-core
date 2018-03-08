import { DAGNode } from 'ipld-dag-pb';
import { validateTransactions, createRewardTransaction } from './../transaction';
import { hexFromMultihash, getDifficulty } from './../../utils';
import { isValid } from './../../schemas';
import { BlockError } from '../errors'
import * as IPFS from 'ipfs-api';
const ipfs = new IPFS();

export const calculateHash = async block => {
  block = await createDAGNode(block);
  return block.multihash.toString('hex').substring(4);
}

export const createDAGNode = ({index, prevHash, time, transactions, nonce}) => {
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
      return resolve(dagNode)
    });
  });
}

/**
 * Create new block
 *
 * @param transactions {array}
 * @param previousBlock {object}
 * @param address {string}
 * @return {index, prevHash, time, transactions, nonce}
 */
export class DAGBlock {
	constructor(options) {
    if (!options) return;
		if (typeof options === 'object' && !Buffer.isBuffer(options)) return this.newBlock(options);
		else return this.get(options);
	}

	newBlock({transactions, previousBlock, address}) {
		transactions = transactions.slice();
		transactions.push(createRewardTransaction(address, previousBlock.index + 1));
		this.data = {
			index: previousBlock.index + 1,
			prevHash: previousBlock.hash,
			time: Math.floor(new Date().getTime() / 1000),
			transactions,
			nonce: 0
		};
		this.data.hash = calculateHash(this.data);
		return this.data;
	}
	transformBlock({multihash, data}) {
	  data = JSON.parse(data.toString());
	  data.hash = hexFromMultihash(multihash);
	  return data;
	};
	async get(hash) {
		this.node = await ipfs.object.get(hash);
		return this.transformBlock(this.node);
	}
	async put(block) {
		this.node = await createDAGNode(block || this.data);
		return await ipfs.object.put(this.node);
	}
}

/**
 * validate block
 *
 * @param {object} previousBlock
 * @param {object} block
 * @param {number} difficulty
 * @param {number} unspent
 */
export const validate = async (previousBlock, block, difficulty, unspent) => {
	if (!isValid('block', block)) return BlockError('data');
	if (previousBlock.index + 1 !== block.index) return BlockError('index');
	if (previousBlock.hash !== block.prevHash) return BlockError('prevhash');
	if (await calculateHash(block) !== block.hash) return BlockError('hash');
	if (getDifficulty(block.hash) > difficulty) return BlockError('difficulty');
	return validateTransactions(block.transactions, unspent);
};

export default DAGBlock;

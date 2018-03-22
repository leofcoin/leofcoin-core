import { config, median, multihashFromHex } from './../../utils';
import { validateTransaction } from './../transaction.js';
import { TransactionError } from './../errors.js';
import { DAGBlock } from './dagblock';
import { encode } from 'bs58';
import IPFS from 'ipfs-api';
const ipfs = new IPFS();

global.chain = [];

export const chain = (() => global.chain)();

export const mempool = (() => [])();

/**
 * Get the transactions for the next Block
 *
 * @return {object} transactions
 */
export const nextBlockTransactions = () => {
	const unspent = getUnspent(false);
	return mempool.filter((transaction) => {
		try {
			return validateTransaction(transaction, unspent);
		} catch (e) {
			if (! (e instanceof TransactionError)) throw e;
		}
	});
};

export const getTransactions = (withMempool = true) => {
	let transactions = chain.reduce((transactions, block) => transactions.concat(block.transactions), []);
	if (withMempool) transactions = transactions.concat(mempool);
	return transactions;
};

export const getTransactionsForAddress = address => {
	return getTransactions(false).filter(tx => tx.inputs.find(i => i.address === address) ||
  tx.outputs.find(o => o.address === address));
};

export const getUnspent = (withMempool = false) => {
	const transactions = getTransactions(withMempool);
	// Find all inputs with their tx ids
	const inputs = transactions.reduce((inputs, tx) => inputs.concat(tx.inputs), []);

	// Find all outputs with their tx ids
	const outputs = transactions.reduce((outputs, tx) =>
		outputs.concat(tx.outputs.map(output => Object.assign({}, output, {tx: tx.id}))), []);

	// Figure out which outputs are unspent
	const unspent = outputs.filter(output =>
		typeof inputs.find(input => input.tx === output.tx && input.index === output.index && input.amount === output.amount) === 'undefined');
	return unspent;
};
export const getUnspentForAddress = address => {
	return getUnspent(true).filter(u => u.address === address);
};
export const getBalanceForAddress = address => {
	return getUnspentForAddress(address).reduce((acc, u) => acc + u.amount , 0);
};
export const difficulty = () => {
	// TODO: lower difficulty when transactionpool contain more then 500 tx ?
	// TODO: raise difficulty when pool is empty
	// get the last 128 blocks
	const start = chain.length >= 128 ? (chain.length - 128) : 0;
	const blocks = chain.slice(start, (chain.length - 1)).reverse();
	const stamps = [];
	for (var i = 0; i < blocks.length; i++) {
		if (blocks[i + 1]) {
			stamps.push(blocks[i].time - blocks[i + 1].time);
		}
	}
	if (stamps.length === 0) {
		stamps.push(10);
	}
	let blocksMedian = median(stamps) || 10;
   // offset for quick recovery
	if (blocksMedian < 10) {
		blocksMedian = blocksMedian - 1.5;
	} else if (blocksMedian > 10){
		blocksMedian = blocksMedian + 1.5;
	}
	return 10000 / (10 / blocksMedian); // should result in a block every 10 seconds
};

export const transformBlock = ({multihash, data}) => {
  data = JSON.parse(data.toString());
  data.hash = hashFromMultihash(multihash);
  return data;
};

export const longestChain = async () => {
  const peers = await ipfs.swarm.peers(); // retrieve peerlist
  const stats = [];
  // if (peers.length === null ) {

    // const { id } = await ipfs.id();
    // peers.push({peer: id})
  // }

  for (const peer of peers) {
    try {
      const ref = await ipfs.name.resolve(peer.peer.toB58String(), {recursive: true});
      const hash = ref.replace('/ipfs/', '');
      // get chain stats for every peer
      const stat = await ipfs.object.stat(hash);
      // push chain length & hash
      stats.push({height: stat.NumLinks - 1, hash});
    } catch (e) {
      console.log(`Ignoring ${peer.peer.toB58String()}`)
    }
  }
  // reduce to longest chain
  // TODO: consider using canditates
  // canditates.push({hash, height})
  // if c.height > p.height => newCanditatesSet ...
  const stat = stats.reduce((p, c) => {
    if (c.height > p.height || c.height === p.height) return c;
  }, {height: 0});
  return stat;
}

export const lastBlock = async () => {
  const { hash, height } = await longestChain();
  const { links } = await ipfs.object.get(hash); // retrieve links
  // TODO: syncChain if needed
  links.sort((a,b) => a.name - b.name); // sort index
  // get block using its ipfs ref
  return await new DAGBlock(encode(links[height].multihash));
};

export const nextBlock = async address => {
  const transactions = nextBlockTransactions();
  const previousBlock = await lastBlock();
  return await new DAGBlock({transactions, previousBlock, address});
};

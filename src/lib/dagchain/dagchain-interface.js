import { config, median, multihashFromHex } from './../../utils';
import { validateTransaction } from './../transaction.js';
import { TransactionError } from './../errors.js';
import { DAGBlock, createDAGNode, validate } from './dagblock';
import { encode, decode } from 'bs58';
import { GENESISBLOCK } from '../../params';
import { resolvePeers } from '../network/peernet';
import IPFS from 'ipfs-api';
const ipfs = new IPFS();

global.chain = global.chain || [
  GENESISBLOCK
];

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
  const offset = blocksMedian / 10
   // offset for quick recovery
	if (blocksMedian < 9) {
		blocksMedian -= offset;
	} else if (blocksMedian > 11) {
		blocksMedian += offset;
	}
  console.log(`Average Block Time: ${blocksMedian}`);
  console.log(`Difficulty: ${10 / blocksMedian}`);
	return 10000 / (10 / blocksMedian); // should result in a block every 10 seconds
};

export const transformBlock = ({multihash, data}) => {
  data = JSON.parse(data.toString());
  data.hash = hashFromMultihash(multihash);
  return data;
};

// TODO: global peerlist
export const longestChain = () => new Promise(async (resolve, reject) => {
  try {
    let peers = await resolvePeers(); // retrieve peerlist
    peers = peers.map(({ peer, addr }) => {return {id: peer.toB58String(), addr: addr.toString()}});
    // peers.push(id);
    const stats = [];
    for (const {addr, id} of peers) {
      try {
        await ipfs.swarm.connect(`${addr}/ipfs/${id}`);
        const ref = await ipfs.name.resolve(id);
        const hash = ref.replace('/ipfs/', '');
        // get chain stats for every peer
        const stat = await ipfs.object.stat(hash);
        // push chain length & hash
        stats.push({height: stat.NumLinks - 1, hash: stat.Hash});
      } catch (e) {
        if (e.code === 'ECONNREFUSED') {
          reject(e);
        }
        console.log(`Ignoring ${id}`)
      }
    }
    // reduce to longest chain
    // TODO: consider using canditates for validating
    // canditates.push({hash, height})
    // if c.height > p.height => newCanditatesSet ...
    const stat = stats.reduce((p, c) => {
      if (c.height > p.height || c.height === p.height) return c;
      else return p;
    }, {height: 0, hash: null});
    resolve(stat);
  } catch (e) {
    reject(e);
  }
});

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
  const previousBlock = chain[chain.length - 1];
  return await new DAGBlock({transactions, previousBlock, address});
};

/**
 * Create a new genesis block
 */
export const newGenesisDAGNode = async difficulty => {
  let dagnode;
  const block = {
    index: 0,
    prevHash: '0',
    time: Math.floor(new Date().getTime() / 1000),
    transactions: [],
    nonce: 0
  };

  dagnode = await createDAGNode(block);
  block.hash = dagnode.multihash.toString('hex').substring(4);
  while (parseInt(block.hash.substring(0, 8), 16) >= difficulty) {
    block.nonce++;
    dagnode = await createDAGNode(block);
    block.hash = dagnode.multihash.toString('hex').substring(4);
  }
  return dagnode;
}

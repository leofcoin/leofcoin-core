import { config } from './../utils';
import params from '../params';
import { isValid } from 'crypto-chain-validator';
import { TransactionError } from './errors.js';
import { transactionInputHash, transactionHash } from './hash.js';
import {chain, mempool} from './dagchain/dagchain';
import { randomBytes } from 'crypto';
import ecdsa from 'ecdsa';
const { sign, verify } = ecdsa;
import bs58 from 'bs58';
/**
 * validate transaction
 *
 * @param transaction
 * @param unspent
 */
export const validateTransaction = (transaction, unspent) => {
	if (!isValid('transaction', transaction)) throw new TransactionError('Invalid transaction');
	if (transaction.hash !== transactionHash(transaction)) throw new TransactionError('Invalid transaction hash');

	// Verify each input signature
	transaction.inputs.forEach(input => {
		if (!verifySignature(input.address, input.signature, transactionHash(input)))
			throw new TransactionError('Invalid input signature');
	});

	// Check if inputs are in unspent list
	transaction.inputs.forEach((input) => {
		if (! unspent.find(out => out.tx === input.tx && out.index === input.index)) { throw new TransactionError('Input has been already spent: ' + input.tx); }
	});

	if (transaction.reward) {
		// For reward transaction: check if reward output is correct
		if (transaction.outputs.length !== 1) throw new TransactionError('Reward transaction must have exactly one output');
		if (transaction.outputs[0].amount !== config.reward) throw new TransactionError(`Mining reward must be exactly: ${config.reward}`);
	} else {
		// For normal transaction: check if total output amount equals input amount
		if (transaction.inputs.reduce((acc, input) => acc + input.amount, 0) !==
      transaction.outputs.reduce((acc, output) => acc + output.amount, 0)) { throw new TransactionError('Input and output amounts do not match'); }
	}

	return true;
};

/**
 * validate transactions list for current block
 *
 * @param {array} transactions
 * @param unspent
 */
export const validateTransactions = (transactions, unspent) => {
	for (const transaction of transactions) {
		validateTransaction(transaction, unspent);
		if (transactions.filter(transaction => transaction.reward).length !== 1)
			throw new TransactionError('Transactions cannot have more than one reward');
	}
};

/**
 * Create transaction
 *
 * @param inputs
 * @param outputs
 * @param reward
 * @return {{id: string, reward: boolean, inputs: *, outputs: *, hash: string}}
 */
const newTransaction = (inputs, outputs, reward = false) => {
	const tx = {
		id: randomBytes(32).toString('hex'),
		time: Math.floor(new Date().getTime() / 1000),
		reward,
		inputs,
		outputs,
	};
	tx.hash = transactionHash(tx);

	return tx;
};

const consensusSubsidy = height => {
	const quarterlings = height / params.consensusSubsidyInterval;
	if (quarterlings >= 256) {
		return 0;
	}
	//subsidy is lowered by 12.5 %, approx every year
	const minus = quarterlings >= 1 ? (quarterlings * (params.reward / 256)) : 0;
	return params.reward - minus;
};

/**
 * Create reward transaction for block mining
 *
 * @param {string} address
 * @return {id: string, reward: boolean, inputs: *, outputs: *, hash: string}
 */
export const createRewardTransaction = (address, height) => {
	return newTransaction([], [{index: 0, amount: consensusSubsidy(height), address}], true);
};

/**
 * Sign transactionHash woth privateKey
 */
const signHash = (hash, privateKey) => {
	return sign(Buffer.from(hash, 'hex'), Buffer.from(privateKey)).signature.toString('base64');
};

const verifySignature = (address, signature, hash) => {
	return verify(Buffer.from(hash, 'hex'), Buffer.from(signature, 'base64'), decode(address));
};

/**
 * Create and sign input
 *
 * @param transaction Based on transaction id
 * @param index Based on transaction output index
 * @param amount
 * @param wallet
 * @return {transaction, index, amount, address}
 */
const createInput = (tx, index, amount, wallet) => {
	const input = {
		tx,
		index,
		amount,
		address: wallet.public,
	};
	input.signature = signHash(transactionInputHash(input), wallet.private);

	return input;
};

/**
 * Create a transaction
 *
 * @param wallet
 * @param toAddress
 * @param amount
 * @param unspent
 * @return {id, reward, inputs, outputs, hash,}
 */
const buildTransaction  = (wallet, toAddress, amount, unspent) => {
	let inputsAmount = 0;
	const inputsRaw = unspent.filter(i => {
		const more = inputsAmount < amount;
		if (more) inputsAmount += i.amount;
		return more;
	});
	if (inputsAmount < amount) throw new TransactionError('Not enough funds');

	const inputs = inputsRaw.map(i => createInput(i.tx, i.index, i.amount, wallet));

	// Send amount to destination address
	const outputs = [{index: 0, amount, address: toAddress}];
	// Send back change to my wallet
	if (inputsAmount - amount > 0) {
		outputs.push({index: 1, amount: inputsAmount - amount, address: wallet.public});
	}

	return newTransaction(inputs, outputs);
};

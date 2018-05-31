import { config } from './../utils';
import params from '../params';
import { isValid } from 'crypto-chain-validator';
import { TransactionError } from './errors.js';
import { transactionInputHash, transactionHash } from './hash.js';
import {chain, mempool} from './dagchain/dagchain';
import { randomBytes } from 'crypto';
import { encode, decode } from 'bs58';
import { getUnspentForAddress } from './dagchain/dagchain-interface';
import MultiHDWallet from './multi-hd-wallet';
import { network } from '../params.js';

/**
 * validate transaction
 *
 * @param transaction
 * @param unspent
 */
export const validateTransaction = (transaction, unspent) => {
	// if (!isValid('transaction', transaction)) throw new TransactionError('Invalid transaction');
	if (transaction.hash !== transactionHash(transaction)) throw TransactionError('Invalid transaction hash');
	const wallet = new MultiHDWallet(network);
	// TODO: versions should be handled here...
	// Verify each input signature
	transaction.inputs.forEach(input => {
  	const { signature, address } = input;
		const hash = transactionInputHash(input);
		if (!wallet.verify(signature, hash, address))
			throw TransactionError('Invalid input signature');
	});

	// Check if inputs are in unspent list
	transaction.inputs.forEach((input) => {
		if (! unspent.find(out => out.tx === input.tx && out.index === input.index)) { throw TransactionError('Input has been already spent: ' + input.tx); }
	});

	if (transaction.reward) {
		// For reward transaction: check if reward output is correct
		if (transaction.outputs.length !== 1) throw TransactionError('Reward transaction must have exactly one output');
		if (transaction.outputs[0].amount !== config.reward) throw TransactionError(`Mining reward must be exactly: ${config.reward}`);
	} else {
		// For normal transaction: check if total output amount equals input amount
		if (transaction.inputs.reduce((acc, input) => acc + input.amount, 0) !==
      transaction.outputs.reduce((acc, output) => acc + output.amount, 0)) { throw TransactionError('Input and output amounts do not match'); }
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
			throw TransactionError('Transactions cannot have more than one reward');
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

const verifySignature = (address, signature, hash) => {
	const wallet = new MultiHDWallet(network);
	return wallet.verify(signature, hash, address);
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
		address: wallet.address,
	};
	// TODO: show notification the tx got signed
	// Sign transactionHash
	input.signature = wallet.sign(transactionInputHash(input));
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
export const buildTransaction  = (wallet, toAddress, amount) => {
	let inputsAmount = 0;
	const unspent = getUnspentForAddress(wallet.address);
	const inputsRaw = unspent.filter(i => {
		const more = inputsAmount < amount;
		if (more) inputsAmount += i.amount;
		return more;
	});
	if (inputsAmount < amount) throw TransactionError('Not enough funds');
	// TODO: Add multiSigning
	const inputs = inputsRaw.map(i => createInput(i.tx, i.index, i.amount, wallet));
	// Send amount to destination address
	const outputs = [{index: 0, amount, address: toAddress}];
	// Send back change to my wallet
	if (inputsAmount - amount > 0) {
		outputs.push({index: 1, amount: inputsAmount - amount, address: wallet.address});
	}

	return newTransaction(inputs, outputs);
};

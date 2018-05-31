import { generateMnemonic, mnemonicToSeed } from 'bip39';
import HDNode from 'bitcoinjs-lib/src/hdnode';
import networks from './networks';

export default class HDWallet {

	constructor(network, hdnode) {
		if (typeof network === 'string') this.network = networks[network];
		else if (typeof network === 'object') this.network = network;
		if (hdnode) this.defineHDNode(hdnode);
	}

	defineHDNode(value) {
		Object.defineProperty(this, 'hdnode', {
			configurable: false,
			writable: false,
			value: value
		});
	}

	generate(network) {
		network = networks[network] || this.network;
		const mnemonic = generateMnemonic();
		const seed = mnemonicToSeed(mnemonic);
		this.defineHDNode(HDNode.fromSeedBuffer(seed, network));
		return { mnemonic }; // userpw
	}

	/**
   * recover using mnemonic (recovery word list)
   */
	recover(mnemonic, network) {
		network = networks[network] || this.network;
		const seed = mnemonicToSeed(mnemonic);
		this.defineHDNode(HDNode.fromSeedBuffer(seed, network));
	}

	load(base58, network) {
		network = networks[network] || this.network;
		this.defineHDNode(HDNode.fromBase58(base58, network));
	}

	save() {
		return this.hdnode.toBase58();
	}
}

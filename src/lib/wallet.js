// import
import { encrypt, decrypt } from 'crypto-io-utils';
import bitcoin from 'bitcoinjs-lib';
import randomBytes from 'randombytes';
import bs58 from 'bs58';
import networks from './networks.js';
// declare
const { ECPair } = bitcoin;
const { encode, decode } = bs58;

export class CryptoWallet {
	constructor(network) {
		if (network) {
			this.network = network;
		} else {
			this.network = 'olivia'; // harcoded to our testnet for now
		}
	}

	set network(value) {
		if (typeof value === 'string') {
			value = networks[value];
		}
		this._network = value;
	}

	get network() {
		return this._network;
	}

	get _jsonWallet() {
		return JSON.stringify({
			wif: this.wif,
			address: this.address
		});
	}

	set private(value) {
		if (value) {
			Object.defineProperty(this, '_private', {
				configurable: false,
				writable: false,
				value: value
			});
		}

	}

	get private() {
		if (!this._private && this.wif) {
			this.private = decode(this.wif).toString('hex'); // decode the wif with base58
		} else if (!this._private && !this.wif) {
			throw new Error('Invalid wallet: missing wif or private key');
		}
		return this._private;
	}

	set address(value) {
		if (value) {
			Object.defineProperty(this, '_address', {
				configurable: false,
				writable: false,
				value: value
			});
		}
	}

	get address() {
		if (!this._address && this.wif) {
			this.address = ECPair.fromWIF(this.wif, this.network).getAddress();
		} else if (!this._address && !this.wif) {
			throw new Error('Invalid wallet: missing wif or address key');
		}
		return this._address;
	}

	get public() {
		return this.address;
	}

	lock(secret) {
		return encrypt(this._jsonWallet, secret)
      .then(cipher => this._cipher = cipher);
	}

	unlock(secret) {
		return decrypt(this._cipher, secret).then(data => JSON.parse(data));
	}

  /**
   * @return {object} {wif, address}
   */
	_updateKeyPair(keyPair) {
		this.wif = keyPair.toWIF(); // private key in wif format
		this.address = keyPair.getAddress(); // public key
		return { wif: this.wif, address: this.address };
	}

  /**
   * Create new address using randomBytes
   */
	_createRandomAddress() {
		const keyPair = ECPair.makeRandom({
			network: this.network,
			rng: () => Buffer.from(randomBytes(32))
		});

		return this._updateKeyPair(keyPair);
	}

	_createAddressFromHash(hash) {
		if (!hash) {
			return console.warn('SHA256 hash required');
		}
		const big = bigi.fromBuffer(hash);
		const keyPair = new ECPair(big);

		return this._updateKeyPair(keyPair);
	}

  /**
   * Create a new address
   * Returns a random address when hash is undefined.
   *
   * @param {*} hash SHA256 hash to generate an address from.
   */
	new(hash) {
		if (hash) {
			return this._createAddressFromHash(hash);
		}
		return this._createRandomAddress();
	}

  /**
   * Get the address using the wif (wallet import format)
   *
   * @param {*} wif The wif address to generate the public key from.
   *
   * **The wif is also set for generating the private key when sending coins.**
   */
	import(wif) {
		this.wif = wif;
		this.address = ECPair.fromWIF(wif, this.network).getAddress();
	}

  /**
   * Send coins to given address
   *
   * @param {*} address The address to send the coins to.
   *
   * Will move to other module probably.
   */
	send() {
		if (this.private && this.address) {
      // TODO: finish ...
		} else {
			throw new Error('Invalid wallet: you should check you address and private key');
		}
    // createTransaction
	}

  /**
   * Send coins to given address
   *
   * @param {*} address The address to send the coins to.
   *
   * Will move to other module probably.
   */
	receive() {
		if (!this.private && this.wif) {
			this.private = decode(this.wif).toString('hex'); // decode the wif with base58
		} else if (this.private && this.public) {
      // TODO: finish ...
		} else {
			throw new Error('Invalid wallet: you should check you address and private key');
		}
    // createTransaction
	}
}
export default CryptoWallet;

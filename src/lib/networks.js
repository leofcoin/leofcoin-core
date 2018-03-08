// https://en.bitcoin.it/wiki/List_of_address_prefixes
// Dogecoin BIP32 is a proposed standard: https://bitcointalk.org/index.php?topic=409731

/**
 * Main network
 * @return {messagePrefix, pubKeyHash, scriptHash, wif, bip32}
 */
const leofcoin = {
	messagePrefix: '\u0019Leofcoin Signed Message:',
	pubKeyHash: 48, // L
	scriptHash: 55, // P
	wif: 63, // S
	bip32: { public: 33108450, private: 33107450 }
};

/**
 * Tesnet
 * @return {messagePrefix, pubKeyHash, scriptHash, wif, bip32}
 */
const olivia = {
	messagePrefix: '\u0019Olivia Signed Message:',
	pubKeyHash: 115, // o
	scriptHash: 118, // p
	wif: 125, // s
	bip32: { public: 33108400, private: 33107350 }
};

const bitcoin = {
	messagePrefix: '\x18Bitcoin Signed Message:\n',
	bech32: 'bc',
	pubKeyHash: 0x00,
	scriptHash: 0x05,
	wif: 0x80,
	bip32: {
		public: 0x0488b21e, private: 0x0488ade4
	}
};

const testnet = {
	messagePrefix: '\x18Bitcoin Signed Message:\n',
	bech32: 'tb',
	pubKeyHash: 0x6f,
	scriptHash: 0xc4,
	wif: 0xef,
	bip32: {
		public: 0x043587cf,
		private: 0x04358394
	}
};

const litecoin = {
	messagePrefix: '\x19Litecoin Signed Message:\n',
	pubKeyHash: 0x30,
	scriptHash: 0x32,
	wif: 0xb0,
	bip32: {
		public: 0x019da462,
		private: 0x019d9cfe
	}
};

/**
 * Our & supported networks
 * @return {leofcoin, olivia}
 */
export default {
	// main network
	leofcoin,
	// testnet
	olivia,
	bitcoin,
	testnet,
	litecoin
};

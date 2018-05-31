// https://en.bitcoin.it/wiki/List_of_address_prefixes
// Dogecoin BIP32 is a proposed standard: https://bitcointalk.org/index.php?topic=409731

/**
 * Main network
 * @return {messagePrefix, pubKeyHash, scriptHash, wif, bip32}
 */
const leofcoin = {
	messagePrefix: '\u0019Leofcoin Signed Message:',
	pubKeyHash: 0x30, // L
	scriptHash: 0x37, // P
	wif: 0x3F, // S
	multiCodec: 0x3c4,
	bip32: { public: 0x13BBF2D4, private: 0x13BBCBC4 }
};

/**
 * Tesnet
 * @return {messagePrefix, pubKeyHash, scriptHash, wif, bip32}
 */
const olivia = {
	messagePrefix: '\u0019Leofcoin Signed Message:',
	pubKeyHash: 0x73, // o
	scriptHash: 0x76, // p
	wif: 0x7D, // s
	multiCodec: 0x7c4,
	bip32: { public: 0x13BBF2D5, private: 0x13BBCBC5 }
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

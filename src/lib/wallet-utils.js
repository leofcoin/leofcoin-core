import MultiWallet from 'multi-wallet';
import { read, write } from 'crypto-io-fs';
import { network, walletPath } from '../params';

// TODO: encrypt
export const writeWallet = async multiWIF => await write(walletPath, multiWIF);

export const readWallet = async () => await read(walletPath, 'string');

export const generateWallet = () => {
	console.log(`Generating wallet for network ${network}`);
	const wallet = new MultiWallet(network);
	const mnemonic  = wallet.generate();
  wallet.mnemonic = mnemonic;
	return wallet;
};

/**
 * @param {object} root Instance of MultiWallet
 */
export const discoverAccounts = root => {
  const accounts = [];
  /**
   * @param {number} depth account depth
   */
  const discover = depth => {
    const account = root.derive(`m/${depth}\'/0/0`);
    // global.chain.reduce((p, c) => {
    //   console.log(p, c);
    //   c.tx.for
    //
    //   }
    // }, [])()
    // check for transactions
    accounts.push(account);
    // if (transactions) {
      // return discover(depth++)
    // } else {
      return accounts;
    // }
  }

  return discover(0);

}

export const loadAccounts = wallet => {
  const accounts = discoverAccounts(wallet);
  return accounts;
}

export const loadWallet = async () => {
  try {
    const saved = await readWallet();
    const root = new MultiWallet(network);
    // TODO: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#Account_discovery @AndrewVanardennen @vandeurenglenn
    // last account is without tx
    // disallow account creation when previous account has no tx
    root.import(saved);
    return root;
  } catch (e) {
    throw e;
  }
}

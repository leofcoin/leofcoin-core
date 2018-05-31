import { server } from 'socket-request';
import { read, write } from 'crypto-io-fs';
import { APPDATAPATH, network } from '../params';
import { join } from 'path';
import { buildTransaction } from '../lib/transaction';
import { addTransaction, mempool } from '../lib/dagchain/dagchain-interface';
import { loadWallet, generateWallet, discoverAccounts } from '../lib/wallet-utils';
import MultiWallet from 'multi-wallet';
import bus from './../lib/bus';

let wallet;

const api = server({port: 6000}, {
	send: async ({from, to, amount, message}, response) => {
		// console.log(params);
    // TODO: validate transaction
		try {
      const multiWIF = await read(join(APPDATAPATH, 'wallet.dat'), 'string');
      const wallet = new MultiWallet(network);
      wallet.import(multiWIF)
      // account ...
      const account = wallet.derive('m/0\'/0/0');
      const tx = buildTransaction(account, to, parseInt(amount))
      mempool.push(tx);
    } catch (e) {
      console.log(e);
    }
	},
  accounts: async (params, response) => {
    let accounts;
    try {
      if (!wallet) wallet = await loadWallet();

      accounts = await discoverAccounts(wallet);
      accounts = accounts.map(account => account.address);
      response.send(accounts, 200);
    } catch (e) {
      console.log(e);
      if (e.code === 'ENOENT') {
        const wallet = await generateWallet();
        const account = wallet.derive(`m/0\'/0/0`)
        response.send({
            mnemonic: wallet.mnemonic,
            accounts: [account]
        }, 201)
      }
    }
  }
});

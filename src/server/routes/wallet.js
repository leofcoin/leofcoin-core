import { Router } from 'express';
import { join } from 'path';
import { homedir } from 'os';
import MultiWallet from 'multi-wallet';
import { read, write } from 'crypto-io-fs';
import { CryptoWallet } from '../../lib/wallet';
import { getBalanceForAddress } from './../../lib/dagchain/dagchain-interface';
import { debug } from '../../utils';
import { APPDATAPATH, network } from '../../params';

const router = Router();

const loadWallet = async () => {
  const saved = await read(join(APPDATAPATH, 'wallet.dat'), 'string');
  const wallet = new MultiWallet(network);
  console.log(saved, network);
  wallet.import(saved);
  return wallet;
}

// TODO: encrypt/decrypt
router.get('/core/new-wallet', async (request, response) => {
  try {
    await read(join(APPDATAPATH, 'wallet.dat'));
    return response.status(302).send('Already Exists')
  } catch (error) {
    debug('No wallet found, making new wallet.')
    const name = request.query.name || 'main';
    const wallet = new CryptoWallet();
    wallet.new();
    const addresses = JSON.stringify([[name, wallet.public]]);
    response.status(200).send(addresses);
    await write(join(APPDATAPATH, 'wallet.dat'), JSON.stringify([
      [name, {private: wallet.private, public: wallet.public}]
    ]));
    await write(join(APPDATAPATH, 'addresses.dat'), addresses);
  }

});

router.get('/core/wallet', async (request, response) => {
  try {
    const wallet = await read(join(APPDATAPATH, 'wallet.dat'), 'string');
    response.status(200).send(wallet)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return response.redirect('/core/new-wallet');
    }
    console.log(error);
    response.status(409).send(error);
  }
});

router.get('/core/new-address', async (request, response) => {
  const name = request.query.name || 'main';
  const wallet = new CryptoWallet();
  wallet.new();
  const walletAddresses = await read(join(APPDATAPATH, 'wallet.dat'), 'json');
  const addresses = await read(join(APPDATAPATH, 'addresses.dat'), 'json');
  const address = [name, wallet.public];
  addresses.push(address);
  walletAddresses.push([name, {private: wallet.private, public: wallet.public}])
  response.status(200).send(JSON.stringify(address));
  await write(join(APPDATAPATH, 'wallet.dat'), JSON.stringify(walletAddresses));
  await write(join(APPDATAPATH, 'addresses.dat'), JSON.stringify(addresses));
});

router.get('/core/addresses', async (request, response) => {
  try {
    const wallet = await loadWallet();
    const account = wallet.derive('m/0\'/0/0');
    response.status(200).send([['external', account.address]]);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return response.redirect('/core/new-wallet');
    }
    response.status(409).send(error);
  }
});

router.get('/core/getbalance/:address', async (request, response) => {
  try {
    const balance = getBalanceForAddress(request.params.address);
    response.status(200).send(String(balance))
  } catch (error) {
    response.status(409).send(error);
  }
});

export default router;

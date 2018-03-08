import { debug } from './../../utils';
import bus from './../bus';
import * as IPFS from 'ipfs-api';
import { join } from 'path';
import { info, fail } from 'crypto-logger';

export const ipfs = new IPFS();

const handleDefaultBootstrapAddresses = async addresses => {
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');
    for (const address of bootstrap) {
      if (addresses.indexOf(address) === -1) {
        const index = bootstrap.indexOf(address);
        bootstrap = bootstrap.slice(index, 0);
      }
    }
    for (const address of addresses) {
      if (bootstrap.indexOf(address) === -1) {
        bootstrap.push(address);
      }
    }

    await ipfs.config.set('Bootstrap', bootstrap);
    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
}

export const connect = addresses => new Promise(async resolve => {
  try {
    bus.emit('connecting', true);
    debug(info('connecting peers'));
    const connected = await ipfs.swarm.connect(addresses)
    const peerinfo = await ipfs.dht.findpeer('QmPgX72kLV9Gopq77tMFAQfMZWBGp6Va3AFcmJyeQawTCm')
    info('peers-connected');
    bus.emit('connecting', false);
    resolve();
  } catch (e) {
    fail(e);
    setTimeout(async () => {
      await connect(addresses);
      resolve();
    }, 200);
  }
});

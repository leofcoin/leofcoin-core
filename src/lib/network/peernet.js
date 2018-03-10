import { debug } from './../../utils';
import bus from './../bus';
import * as IPFS from 'ipfs-api';
import { join } from 'path';
import { info, fail, succes } from 'crypto-logger';

export const ipfs = new IPFS();

const handleDefaultBootstrapAddresses = async peers => {
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');

    for (const peer of peers) {
      const addresses = peer.multiaddrs.toArray().forEach(address => address.toString());
      peer.multiaddrs.toArray().forEach(address => console.log(address.toString()));
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
    }

    await ipfs.config.set('Bootstrap', bootstrap);
    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
}
export const connect = (address) => new Promise(async (resolve) => {
  bus.emit('connecting', true);
  debug(info('connecting peers'));
  ipfs.swarm.addrs(async (err, peers) => {
    if (err) {
      setTimeout(async () => {
        await connect();
      }, 200);
    }
    if (peers.length === 0) {
      setTimeout(async () => {
        await connect();
      }, 200);
    }
    // await handleDefaultBootstrapAddresses(peers)
    debug(succes(`connected to ${peers.length} peers`))
    bus.emit('connecting', false);
    resolve()
  });
})

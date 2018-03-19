import { debug } from './../../utils';
import bus from './../bus';
import IPFS from 'ipfs-api';
import { join } from 'path';
import { info, fail, succes } from 'crypto-logger';
import { seeds } from '../../params';
import { DAGNode } from 'ipld-dag-pb';
import { encode } from 'bs58';
const { promisify } = require('util');

export const ipfs = new IPFS();
// TODO: create bootstrap according peer reputation ...
const handleDefaultBootstrapAddresses = async addresses => {
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');
    const peers = await ipfs.swarm.peers();
    // peers.forEach(peer => console.log(peer.peer.toB58String()))
    // addresses.forEach(address => !bootstrap.indexOf(address) )
    for (const peer of addresses) {
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
export const connect = (addresses) => new Promise(async (resolve) => {
  bus.emit('connecting', true);
  debug(info('connecting peers'));
  const { id } = await ipfs.id();
  addresses = addresses.map(address => address.includes(id) ? null : address);
  await handleDefaultBootstrapAddresses(addresses);
  await ipfs.swarm.connect(addresses);
  debug(succes(`connected to ${addresses.length} peers`));
  await ipfs.pubsub.publish('peer-connected', new Buffer(id));

  ipfs.pubsub.subscribe('peer-connected', event => {
    console.log(event);
  });
  bus.emit('connecting', false);
  resolve()
})

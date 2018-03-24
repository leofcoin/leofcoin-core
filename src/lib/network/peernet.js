import { debug } from './../../utils';
import bus from './../bus';
import IPFS from 'ipfs-api';
import { join } from 'path';
import { info, fail, succes, log } from 'crypto-logger';
import { seeds } from '../../params';
import { DAGNode } from 'ipld-dag-pb';
import { encode } from 'bs58';
const { promisify } = require('util');

export const ipfs = new IPFS();
// TODO: create bootstrap according peer reputation ...
const handleDefaultBootstrapAddresses = async addresses => {
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');
    // const peers = await ipfs.swarm.peers();
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

let done = false;
let runs = 0
export const resolvePeers = () => new Promise(resolve => {
  if (runs === 5) {
    info('searched for peers but none found, returning empty array');
    return resolve([]);
  }
  const resolves = peers => {
    done = true;
    resolve(peers);
  }
  ipfs.swarm.peers().then(peers => resolves(peers));
  runs++;
  if (!done) setTimeout(() => resolvePeers().then(peers => resolves(peers)), 3000);
})

export const _connect = async addresses =>
  new Promise(async (resolve, reject) => {
    try {
      await ipfs.swarm.connect(addresses);
      resolve();
    } catch (e) {
      fail(e.message);
      info('trying again')
      return setTimeout(async () => await _connect(addresses).then(() => resolve()), 1000);
    }
  });

export const connect = (addresses) => new Promise(async (resolve) => {
  bus.emit('connecting', true);
  debug(info('connecting peers'));
  const { id } = await ipfs.id();
  // TODO: filter using peerrep
  addresses = addresses.map(address => {
    if(!address.includes(id)) return address
  });
  await handleDefaultBootstrapAddresses(addresses); // TODO: invoke only on install
  const peers = await resolvePeers();
  peers.forEach(({addr}) => addresses.push(addr));
  if (addresses) {
    await _connect(addresses)
  }
  debug(succes(`connected to ${addresses.length} peers`));

  ipfs.pubsub.subscribe('peer-connected', event => {
    // TODO: update reputations
    if (event.from !== id) console.log(event); // announcepeer
  });
  ipfs.pubsub.publish('peer-connected', new Buffer(id));
  bus.emit('connecting', false);
  resolve()
})

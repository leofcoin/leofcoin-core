import { debug, fail, succes } from './../../utils';
import bus from './../bus';
import { join } from 'path';
import { seeds } from '../../params';
import { DAGNode } from 'ipld-dag-pb';
import { encode } from 'bs58';
const { promisify } = require('util');
import ipfs from './ipfs-mock';

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
    return 1;
  }
}

let done = false;
let runs = 0
export const resolvePeers = () => new Promise(resolve => {
  if (runs === 5) {
    debug('searched for peers but none found, returning empty array');
    return resolve([]);
  }
  const resolves = peers => {
    done = true;
    resolve(peers);
  }
  ipfs.swarm.peers().then(peers => resolves(peers));
  runs++;
  if (!done) setTimeout(() => resolvePeers().then(peers => resolves(peers)), 1000);
})

export const _connect = async addresses =>
  new Promise(async (resolve, reject) => {
    try {
      await ipfs.swarm.connect(addresses);
      resolve();
    } catch (e) {
      fail(e.message);
      debug('trying again')
      return setTimeout(async () => await _connect(addresses).then(() => resolve()), 1000);
    }
  });
export const connect = (addresses = []) => new Promise(async (resolve, reject) => {
  try {
    bus.emit('connecting', true);
    debug('connecting peers');
    const { id } = await ipfs.id();
    // TODO: filter using peerrep
    let peers = await resolvePeers();
    // transform peers into valid ipfs addresses
    peers = peers.map(({addr, peer}) => `${addr.toString()}/ipfs/${peer.toB58String()}`);
    if (peers && peers.length === 0) peers = addresses;

    await _connect(peers);
    
    succes(`connected to ${peers.length} peer(s)`);

    ipfs.pubsub.subscribe('peer-connected', event => {
      // TODO: update reputations
      if (event.from !== id) console.log(event); // announcepeer
    });
    ipfs.pubsub.publish('peer-connected', new Buffer(id));
    bus.emit('connecting', false);
    resolve();
  } catch (e) {
    reject(e)
  }
})

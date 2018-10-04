import { debug, fail, succes } from './../../utils';
import bus from './../bus';
import { join } from 'path';
import { seeds, signalServers } from '../../params';
import { DAGNode } from 'ipld-dag-pb';
import { encode } from 'bs58';
const { promisify } = require('util');
import ipfs from './ipfs-mock';

// TODO: create bootstrap according peer reputation ...
const handleDefaultBootstrapAddresses = async addresses => {
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');
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
let runs = 0;

export const resolvePeers = () => new Promise(resolve => {
  if (runs === 2) {
    debug('searched for peers but none found, returning empty array');
    runs = 0;
    return resolve([]);
  }
  const resolves = peers => {
    done = true;
    runs = 0;
    resolve(peers);
  }
  ipfs.swarm.peers().then(peers => resolves(peers));
  runs++;
  if (!done) setTimeout(() => resolvePeers().then(peers => resolves(peers)), 1000);
})

export const resolveAddresses = async () => {
  const peers = await resolvePeers();
  return peers.map(({addr, peer}) => `${addr.toString()}/ipfs/${peer.toB58String()}`);
}

/**
 * Get peers from 'star' peerset or resolve from network
 */
const getPeerAddresses = async peers => {
  if (global.peerset.size === 0) return resolveAddresses();
  return [...global.peerset.values()]
}

let conRuns = 0;
export const _connect = async addresses =>
  new Promise(async (resolve, reject) => {
    // TODO: ignore address after 5 times
    try {
      conRuns++;
      await ipfs.swarm.connect(addresses);
      conRuns = 0;
      resolve();
    } catch (e) {
      if (conRuns === 2) {
        conRuns = 0;
        return resolve();
      }
      fail(e.message);
      debug('trying again');
      return setTimeout(async () => await _connect(addresses).then(() => resolve()), 1000);
    }
  });
export const connectBootstrap = async addresses => {
  bus.emit('connecting', true);
  debug('connecting bootstrap peers');

  await _connect(signalServers);

  succes(`connected to ${signalServers.length} bootstrap peer(s)`);
}
export const connect = (peers = []) => new Promise(async (resolve, reject) => {
  try {
    bus.emit('connecting', true);
    debug('connecting peers');

    const { id } = await ipfs.id();
    // TODO: filter using peerrep
    peers = await getPeerAddresses();
    peers = peers.map(peer => {
      if (!peer.includes(id)) return peer;
    })
    await _connect(peers);

    succes(`connected to ${peers.length} peer(s)`);

    ipfs.pubsub.publish('peer-connected', new Buffer(id));
    bus.emit('connecting', false);
    resolve();
  } catch (e) {
    reject(e)
  }
})

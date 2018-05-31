import { join } from 'path';
import { homedir } from 'os';
import { decode, encode } from 'bs58';
import { read } from 'crypto-io-fs';
import { keccak } from 'leofcoin-hash';
const argv = process.argv;

export const networks = {
	'leofcoin': join(homedir(), '.leofcoin'),
	'olivia': join(homedir(), '.leofcoin/olivia')
};

export const network = (() => {
  const index = argv.indexOf('--network');
  return process.env.NETWORK || (index > -1) ? argv[index + 1] : 'leofcoin';
})()

export const verbose = Boolean([
  argv.indexOf('-v'),
  argv.indexOf('--verbose'),
  process.env.VERBOSE ? 1 : -1
].reduce((p, c) => {
  if (c > p) return c;
  return Number(p)
}, -1) >= 0);

export const olivia = process.argv.includes('olivia') || process.argv.includes('testnet');
export const genesis = process.argv.includes('genesis');
export const AppData = join(homedir(), 'AppData', 'Roaming', olivia ? 'Leofcoin/olivia' : 'Leofcoin');
const netHash = net => encode(keccak(Buffer.from(`${net}-`), 256)).slice(0, 24);
export const APPDATAPATH = (() => {
  switch (process.platform) {
    case 'win32':
      return join(homedir(), 'AppData', 'Roaming', 'Leofcoin', olivia ? 'olivia' : '')
      break;
    case 'linux':
      return join(homedir(), '.leofcoin', olivia ? 'olivia' : '')
      break;
    case 'darwin':
      // TODO: implement darwin path
      break;
    case 'android':
      // TODO: implement android path
      // experimental
      break;
  }
})();

export const walletPath = join(APPDATAPATH, 'wallet.dat');
export const mainNethash = netHash('leofcoin');

/**
 * returns the hash for a subnet, prefixed with mainNethash
 */
const subnetHash = net => {
  const prefix = mainNethash.slice(0, 4);
  const hash = netHash(net);
  return `${prefix}${hash.slice(4, hash.length)}`
}
export const testNethash = subnetHash('olivia');

export const netPrefix = (() => network === 'leofcoin' ? mainNethash : testNethash)()
export const signalServers = (() => {
  if (network === 'olivia') return [
    '/ip4/162.208.10.171/tcp/4002/ipfs/QmNwuenPwwVKuQRHksR4YHtWS91n5PoyqyK3Focbm1uU4d'
  ]
  else return [
    '/ip4/162.208.10.171/tcp/4002/ipfs/QmXWTPiAg52FH87p7nVMcJVmMUzmLVLRDpT1yh1apb9xKr'
  ]
})()

export const netKeys = {
  olivia: `/key/swarm/psk/1.0.0/
  /base16/
  b37e0b6f3574931ce7a0ef863f64b0f01ba111bb7fabb6a661fc67b51b4ddd15`,
  leofcoin: `/key/swarm/psk/1.0.0/
  /base16/
  0b78a0dcb430dd77311ab6629aa6b75fa05c6779a567dcc176b2299853e6f746`
}

export const netKey = netKeys[network];
export const networkPath = networks[network];
export const netKeyPath = join(networkPath, 'swarm.key');
export const localCurrent = join(networkPath, 'db', 'current');
export const localIndex = join(networkPath, 'db', 'index');
export const localDAGAddress = join(networkPath, 'db', 'dag.multiaddress');
// export const
// TODO: remove seed once we have a static ip for our ipfs daemon node
// untill seed is removed we retrieve the keys using socket.io
// TODO: make AppData overwriteable
export const seed = 'https://septimal-balinese-2547.dataplicity.io';
export const seeds = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';
export const configPath = join(AppData, 'core.config');
export const reward = 150;
export const consensusSubsidyInterval = 52500;
export const consensusSubsidyPercentage = 12.5; // quarterlings
export const genesisCID = '1220000026e43a85c01ab04183ecce485637ac15d7423bea5fd0a72019da9afe2936'; // // TODO: should be hardcoded

export const GENESISBS58 = 'uVd8DSSuJkh8P8WbMsUTknyidJV8V8eUBL8Pg8ijHbgQBnkjDVrKky5EWD19F3vY9uApjMkb47oah95qDrYXWqNbJzLKAWFaxdCmcjGFv';
export const GENESISBLOCK = (() => {
	const block = JSON.parse(Buffer.from(decode(GENESISBS58)).toString());
	block.hash = genesisCID.substring(4);
	return block;
})();
export const localDAGMultiaddress = async () => {
  try {
    const address = await read(localDAGAddress, 'string')
    return address;
  } catch (e) {
    console.warn(`initial run::${e}`)
  }
};

export const checkpoints = [
];

export default {
	seed,
	AppData,
	configPath,
	localCurrent,
	localIndex,
	reward,
	consensusSubsidyInterval,
	consensusSubsidyPercentage
};

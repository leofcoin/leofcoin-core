import { join } from 'path';
import { homedir } from 'os';
import { decode } from 'bs58';
import { read } from 'crypto-io-fs';

export const networks = {
	'leofcoin': join(homedir(), '.leofcoin'),
	'olivia': join(homedir(), '.leofcoin/olivia')
};

export const signalServers = [
  '/ip4/84.193.79.27/tcp/4002/ipfs/QmXN5cqP2rd38f2zsDjAM2Y4geXF3jegEma392fdSohfx3'
]

export const olivia = process.argv.includes('olivia') || process.argv.includes('testnet');
export const genesis = process.argv.includes('genesis');
export const network = olivia ? 'olivia' : 'leofcoin';
export const AppData = join(homedir(), 'AppData', 'Roaming', 'Leofcoin');


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
export const genesisCID = '12200000248bfb7fea0ba4ff67b3ff7370c0683cc8cdab540a47766e147fa3b58566'; // // TODO: should be hardcoded

export const GENESISBS58 = 'CtoFKgJCQ46vL4WpCykNvRTu2RohfYe35c9ULjz2stMi3u47PmYmPX8LYBLA9r1QKufjkVW43EtRZ4pd7wRwhHNt7RmZMeN8hqU7XDJ4';
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

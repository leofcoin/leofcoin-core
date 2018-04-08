import { join } from 'path';
import { homedir } from 'os';
import { decode } from 'bs58';
import { read } from 'crypto-io-fs';
// paths
export let olivia;
export let genesis;

const args = process.argv.forEach(arg => {
	if (arg === 'olivia' || arg === 'testnet') olivia = true;
	if (arg === 'genesis') genesis = true;
});

// TODO: finish multiple network support (setup multiple repos etc) see issue #6
export const networks = {
	'leofcoin': join(homedir(), '.leofcoin'),
	'olivia': join(homedir(), '.leofcoin/olivia')
};
export const AppData = join(homedir(), 'AppData', 'Roaming', 'Leofcoin');


export const networkPath = networks[olivia ? 'olivia': 'leofcoin'];
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
export const bootstrap = [];
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
export const localDAGMultiaddress = (async () => await read(localDAGAddress, 'string'))()

export const checkpoints = [
];

export default {
	seed,
	bootstrap,
	AppData,
	configPath,
	localCurrent,
	localIndex,
	reward,
	genesis,
	consensusSubsidyInterval,
	consensusSubsidyPercentage
};

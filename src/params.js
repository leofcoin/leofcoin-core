import { join } from 'path';
import { homedir } from 'os';
// paths
export let olivia;
export let genesis;

const args = process.argv.forEach(arg => {
	if (arg === 'olivia' || arg === 'testnet') olivia = true;
	if (arg === 'genesis') genesis = true;
});
console.log(olivia);

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
export const genesisCID = '1220000014cee068f2102c760660e43456beaa101161e98be0f7b7281296c7afdf0f'; // // TODO: should be hardcoded
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

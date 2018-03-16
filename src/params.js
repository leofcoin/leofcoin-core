import { join } from 'path';
import { homedir } from 'os';
// paths
export const AppData = join(homedir(), 'AppData', 'Roaming', 'Cryptocoin');
export const localCurrent = join(AppData, 'db', 'current');
export const localIndex = join(AppData, 'db', 'index');
export const netKeyPath = join(homedir(), '.ipfs', 'swarm.key');
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

export const dagchain = 'QmRGE6LpXchjcZM5h6grF7cftqPUho5yw5Uya5M8qQF9KG'; // QmPgX72kLV9Gopq77tMFAQfMZWBGp6Va3AFcmJyeQawTCm
export const genesis = '122000001676d7bc4ad56642a63557ed6d81eb2107ca00b8db060d1cf32f53c92d52';
export const checkpoints = [
	'QmNLgJyShR2Nef3ncZKqTHxWVE1kvBWLpPDbPyQ9xfwfX3' // genesis block
];

export default {
	seed,
	bootstrap,
	AppData,
	configPath,
	localCurrent,
	localIndex,
	reward,
	dagchain,
	genesis,
	consensusSubsidyInterval,
	consensusSubsidyPercentage
};

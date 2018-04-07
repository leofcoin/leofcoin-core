import { initConnection } from './lib/network/secure-client-connection';
import { getUserConfig, debug, allowFailureUntillEnough } from './utils';
import bus from './lib/bus';
import { join } from 'path';
import './server/index';
import { connect } from './lib/network/peernet';
import { DAGChain } from './lib/dagchain/dagchain';
import { networkPath, configPath } from './params';
import { IPFSNode, cleanRepo, closeRepo } from './lib/network/ipfs-node';
import { write } from 'crypto-io-fs';

global.states = {
  ready: false,
  syncing: false,
  connecting: false,
  mining: false
};

export const core = async ({ genesis, network }) => {
	try {
    const now = Date.now();
    const config = await getUserConfig;
    const connection = await initConnection;
    const secure_now = Date.now();
    bus.emit('stage-one');
    const {ipfsd, repo} = await IPFSNode();

    const ipfsd_now = Date.now();
    process.on('SIGINT', async () => {
      console.log("Caught interrupt signal");
      await ipfsd.stop();
      setTimeout(async () => {
        process.exit();
      }, 10);
      //graceful shutdown
    });
    await connect([connection.address]);
    const connection_now = Date.now();
    bus.emit('stage-two');
    console.groupCollapsed('prepare for init');
    console.log(`secure-connection took: ${(secure_now - now) / 1000} seconds`);
    console.log(`ipfs daemon startup took: ${(ipfsd_now - secure_now) / 1000} seconds`);
    console.log(`peer connection took: ${(connection_now - ipfsd_now) / 1000} seconds`);
    console.log(`total load prep took ${(Date.now() - now) / 1000} seconds`);
    console.groupEnd();
    await write(configPath, JSON.stringify(config, null, '\t'));

    const chain = new DAGChain({ genesis, network });
    await chain.init();
	} catch (e) {
    if (e.code === 'ECONNREFUSED' || e.message && e.message.includes('cannot acquire lock')) {
      await cleanRepo();
      console.log('retrying');
      return core({ genesis, network });
    }
		console.error(`load-error::${e}`);
    process.exit()
	}
}

export default core({genesis: false, network: 'leofcoin'})

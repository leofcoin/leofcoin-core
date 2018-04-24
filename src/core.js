// import { initConnection } from './lib/network/secure-client-connection';
import { getUserConfig, debug, allowFailureUntillEnough, log, groupCollapsed } from './utils';
import bus from './lib/bus';
import { join } from 'path';
import './server/index';
import { connect, connectBootstrap } from './lib/network/peernet';
import { DAGChain } from './lib/dagchain/dagchain';
import { configPath } from './params';
import { IPFSNode, cleanRepo, closeRepo } from './lib/network/ipfs-node';
import { write } from 'crypto-io-fs';
import ipfsStar from './lib/network/ipfs-star'

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
    // const connection = await initConnection;
    const secure_now = Date.now();
    bus.emit('stage-one');
    const { ipfsd } = await IPFSNode();
    const { addresses } = await ipfsd.api.id();
    await connectBootstrap();
    const star = ipfsStar(addresses[0], ipfsd.api.pubsub)

    const ipfsd_now = Date.now();
    process.on('SIGINT', async () => {
      console.log("Caught interrupt signal");
      await star.stop();
      await ipfsd.stop();
      setTimeout(async () => {
        process.exit();
      }, 50);
      //graceful shutdown
    });
    await connect();
    const connection_now = Date.now();
    bus.emit('stage-two');
    groupCollapsed('Initialize', () => {
      log(`secure-connection took: ${(secure_now - now) / 1000} seconds`);
      log(`ipfs daemon startup took: ${(ipfsd_now - secure_now) / 1000} seconds`);
      log(`peer connection took: ${(connection_now - ipfsd_now) / 1000} seconds`);
      log(`total load prep took ${(Date.now() - now) / 1000} seconds`);
    })
    await write(configPath, JSON.stringify(config, null, '\t'));
    const chain = new DAGChain({ genesis, network, ipfs: ipfsd.api });
    
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
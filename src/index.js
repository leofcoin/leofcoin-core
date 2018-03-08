import daemon from 'crypto-daemon';
import { write } from 'crypto-io-fs';
import { initConnection } from './lib/network/secure-client-connection';
import { getUserConfig, debug } from './utils';
import params from './params';
import bus from './lib/bus';
import './server/index';
import { DAGChain } from './lib/dagchain/dagchain';
import * as IPFS from 'ipfs-api';
import { connect } from './lib/network/peernet';
global.CHAIN_CONFIG = params;
const ipfs = new IPFS();

global.states = {
  ready: false,
  syncing: false,
  connecting: false,
  mining: false
};

const loadDaemon = new Promise((resolve, reject) => {
	const daemonReady = () => {
  	daemon.removeListener('ready', daemonReady);
    resolve();
	};
	daemon.on('ready', daemonReady);
	daemon.start(['--enable-pubsub-experiment']);
});

const handleDefaultBootstrapAddresses = async addresses => {
  debug('handleDefaultBootstrapAddresses');
  try {
    let bootstrap = await ipfs.config.get('Bootstrap');
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

    await ipfs.config.set('Bootstrap', bootstrap);
    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
}

export const core = async ({ genesis, network }) => {

	try {
    const config = await getUserConfig;
    const connection = await initConnection;
    bus.emit('stage-one');

    if (config.bootstrap.indexOf(connection.address) === -1) {
      config.bootstrap.push(connection.address);
    }

    await loadDaemon;
    await handleDefaultBootstrapAddresses(connection.address);
    await connect(connection.address);
    bus.emit('stage-two');

    write(params.configPath, JSON.stringify(config, null, 2));

    const chain = new DAGChain();
	} catch (e) {
		console.error(`load-error::${e}`);
	}
}

export default core({genesis: false, network: 'leofcoin'})

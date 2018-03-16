import { read } from 'crypto-io-fs';
import params from '../params';
import bus from '../lib/bus';
import Miner from '../lib/miner';
const { configPath } = params;
class CoreRequestError {
  constructor(message) {
    throw `core-requests-error::${message}`;
  }
}

const readForResponse = (path, format) => new Promise(async (resolve, reject) => {
  const response = {};
  try {
    response.data = await read(path, format);
    response.status = 200;
  } catch (error) {
    response.status(409).send(error)
  }
  resolve(response);
});

const writeForResponse = (path, data) => new Promise(async (resolve, reject) => {
  const response = {};
  try {
    await write(path, JSON.stringify(data));
    response.status = 200;
  } catch (error) {
    response.status(409).send(error)
  }
  resolve(response);
});

const miners = [];

const handleMinerRequest = async ({name, params}) => {
  const response = {status: 409, data: null};

  try {
    switch (name) {
      case 'config':
        response.data = await read(configPath, 'json');
        response.data = response.data.miner;
        response.status = 200;
        break;
      case 'mine':
        const { address, intensity } = params;
        const addMiner = count => {
          for (var i = 0; i < count; i++) {
            const miner = new Miner();
            miner.address = address;
            miners.push(new Miner());
          }
        }
        if (!intensity) {
          intensity = 1;
        }
        if (!address) return console.warn('address undefined');
        if (params.mining) {
          if (miners.length > 0 && miners.length === intensity) {
            miners.forEach(miner => {
              miner.address = address;
            });
          } else if (miners.length > intensity) {
            const removeCount = miners.length - intensity
            miners.slice(0, removeCount);
          } else if (miners.length < intensity && miners.length > 0) {
            const addCount = intensity - miners.length;
            addMiner(addCount);
          } else {
            addMiner(intensity);
          }

          if (!miners.mining) {
            miners.forEach(miner => {
              miner.start();
            });
            miners.mining = true;
            global.states.mining = true
            bus.emit('mining', true);
          }
        } else {
          miners.forEach(miner => {
            miner.stop();
          });
          miners.mining = false;
          global.states.mining = false
          bus.emit('mining', false);
        }
        break;
      case 'address':
        if (set) {
          response = await readForResponse(configPath, 'json');
          if (response.data.miner.address !== address) {
            response.data.miner.address = address;
            response = await writeForResponse(configPath, response.data);
          }
        } else if (get) {
          response = await readForResponse(params.configPath, 'json');
          response.data = response.data.miner.address;
        } else {
          response.status(409).send('set or get wanted for @miner/address');
        }
        break;
    }
    return response;
  } catch (error) {
    throw error;
  }
}

const handleStatusRequest = async ({name, params}) => {
  const response = {status: 409, data: null};
  // get state from the global states object
  const state = global.states[name];
  if (typeof state === 'boolean') {
    response.data = state;
    response.status = 200;
  }
  return response;
}

export default async ({type, name, params}) => {
  switch (type) {
    case 'miner':
      return handleMinerRequest({name, params});
      break;
    case 'status':
      return handleStatusRequest({name, params});
      break;
  }
}

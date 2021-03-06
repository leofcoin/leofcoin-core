'use strict';
import { read, write } from 'crypto-io-fs';
import { configPath } from './params';
import { encode } from 'bs58';
import chalk from 'chalk';
import { generateWallet, writeWallet } from './lib/wallet-utils';
import bus from './lib/bus';

if (process.platform === 'win32') {
  const readLine = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readLine.on('SIGINT', () => {
    process.emit('SIGINT');
  });
};

export const debug = (text) => {
	if (process.env.DEBUG) {
    const stack = new Error().stack;
    const caller = stack.split('\n')[2].trim();
    console.groupCollapsed(chalk.blue(text));
    console.log(caller)
    console.groupEnd();
  };
};

export const log = text => {
  console.log(chalk.cyan(text));
}

export const succes = text => {
  console.log(chalk.green(text));
}

export const fail = text => {
  console.log(chalk.red(text));
}

export const groupCollapsed = (text, cb) => {
  console.groupCollapsed(chalk.gray.bold(text));
  cb();
  console.groupEnd();
}
/**
 * Get hash difficulty
 *
 * @param hash
 * @return {Number}
 */
export const getDifficulty = hash => {
	return parseInt(hash.substring(0, 8), 16);
};

export const textlog = async text => {
  let content = '';
  try {
    // content = await read('log');
  } catch (e) {
    console.log('creating new log file');
  }

  content += '\n';
  content += text;
  return
  // await write('log', content);
};

export const timeout = (ms = 1000, cb) => {
	setTimeout(() => {
		cb();
	}, ms);
};

export const interval = (cb, ms = 1000) => {
	setInterval(() => {
		cb();
	}, ms);
};

export const hashes = nonce => {
	const hashrates = [10, 100, 1000, 10000, 100000, 1000000, 1000000000, 1000000000000, 1000000000000000];
	for (let i = hashrates.length; i-- > 0;) {
		if (nonce % hashrates[i - 1] === 0) return hashrates[i - 1];
	}
	return hashrates.filter(hashrate => {
		if (nonce % hashrate === 0) return hashrate;
	});
};

export const median = array => {
  array.sort( function(a,b) {return a - b;} );

  var half = Math.floor(array.length/2);

  if(array.length % 2)
    return array[half];
  else
    return (array[half-1] + array[half]) / 2.0;
}

let previousDate = Date.now();
let previousMinuteDate = Date.now();
let hashCount = 0;
let timeoutRunning = false;
let rates = []
export const hashLog = nonce => {
	if (typeof(hashes(nonce)) === 'number') {
		hashCount = hashCount + hashes(nonce);
	}
  const now = Date.now()
  // if (now - previousMinuteDate >= 60000) {
    // previousMinuteDate = now;
    // const middle = median(rates);
  if (now - previousDate >= 1000) {
    previousDate = now;
    rates[hashCount]
    hashCount = 0;
    return rates;
  }


};

export const config = {
	server: {
		port: 3030,
		host: 'localhost',
	},
	p2p: {
		port: 6001,
		peers: [],
	},
	reward: 150,
	peers: []
};

const defaultConfig = async () => {
  const wallet = generateWallet();
  // TODO: prompt for password
  bus.on('initial-setup', message => {
    console.log(message);
  })
  bus.emit('initial', wallet.mnemonic);
  await writeWallet(wallet.export());
  const account = wallet.derive('m/0\'/0/0');
	return {
  	miner: {
  		address: account.address,
  		intensity: 1
  	}
  }
};

export const hexFromMultihash = multihash => {
  return multihash.toString('hex').substring(4);
}

export const multihashFromHex = hex => {
  return encode(new Buffer(`1220${hex}`, 'hex'));
}

// TODO: also check for configfile in the directory where core is run from @AndrewVanardennen
// search for the config file & create new one when needed
export const getUserConfig = new Promise(resolve => {
	read(configPath, 'json')
    .then(config => resolve(config))
		.catch(async error => {
			if (error.code !== 'ENOENT') {
				console.error(error);
			}
			resolve(await defaultConfig());
			debug('new config file created');
		});
});

/**
 * allow retry upto "amount" times
 * @param {number} amount
 */
export const allowFailureUntillEnough = (func, amount = 5) => new Promise(async (resolve, reject) => {
  if (typeof func !== 'function') reject('function undefined');
  if (typeof amount !== 'number') reject(`Expected amount to be a typeof Number`);
  let count = 0;
  for (var i = 0; i < amount; i++) {
    try {
      await func();
      resolve();
    } catch (error) {
      if (amount === count) reject(error);
    }
  }
});

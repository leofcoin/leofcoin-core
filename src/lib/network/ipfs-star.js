import { encode } from 'bs58';
// TODO: rename to client
global.peerset = new Map();
/**
 * removes peer from peerset
 */
const peerdisconnect = message => {
  global.peerset.delete(message.from);
}

/**
 * removes peer from peerset
 */
const peerconnect = message => {
  global.peerset.set(message.from, message.data.toString());
}

/**
 * @param {method} options.subscribe pubsub subscriber
 * @param {method} options.publish pubsub publisher
 */
export default (address, network, pubsub) => {
	if (!pubsub && !global.ipfs) throw Error('pubsub client not found');
	else if (!pubsub && global.ipfs) pubsub = global.ipfs.pubsub;
  if (!network) throw Error('network required');
	const {subscribe, publish, unsubscribe} = pubsub;
  const prefix = network === 'leofcoin' ? 'leofcoin-' : 'leofcoin-olivia-';
  const peers = message => {
    subscribe(encode(Buffer.from(`${prefix}peernet-peer-connect`)), peerconnect);
    JSON.parse(message.data.toString()).forEach(peer => {
      peerset.set(peer[0], peer[1]);
    })
  	unsubscribe(encode(Buffer.from(`${prefix}peernet-peers`)), () => {});
  };
	subscribe(encode(Buffer.from(`${prefix}peernet-peers`)), peers);
  subscribe(encode(Buffer.from(`${prefix}peernet-peer-disconnect`)), peerdisconnect);
  // let the network know there is a new peer
	publish(encode(Buffer.from(`${prefix}peernet`)), new Buffer(address));
	return {
		stop: async () => {
	    publish(encode(Buffer.from(`${prefix}peernet-peer-disconnect`)), Buffer(address));
		},
    peers: () => peerset
	};
};

import IPFS from 'ipfs-api';
const ipfs = new IPFS()
export const config = {
	get: property => ipfs.config.get(property),
	set: (property, value) => ipfs.config.set(property, value),
};

export const swarm = {
	peers: () => ipfs.swarm.peers(),
	connect: addresses => new Promise((resolve, reject) => {
		try {
      addresses.forEach(async addr =>{
  			await ipfs.swarm.connect(addr);
  		});

  		resolve();
    } catch (e) {
      reject(e)
    }
	})
};

export const pubsub = {
	subscribe: (channel, cb) => ipfs.pubsub.subscribe(channel, cb),
	publish: (channel, cb) => ipfs.pubsub.publish(channel, cb)
};

export const name = {
	resolve: multihash => ipfs.name.resolve(multihash),
	publish: multihash => ipfs.name.publish(multihash)
};

export const id = () => ipfs.id();

export default {
	id,
	swarm,
	config,
	pubsub
};

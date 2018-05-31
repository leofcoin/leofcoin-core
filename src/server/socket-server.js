import { server as WebSocketServer } from 'websocket';
import bus from '../lib/bus';
import coreRequests from './core-requests';
// import http = from 'http';

export const clientResponse = ({type, name, data}, encoding = 'utf8') => {
	data = {
		data,
		status: 200
	};
	const response = {
		type,
		name,
		data
	};
	if (encoding === 'utf8') {
		return JSON.stringify(response);
	}
	return response;
};

export class ClientConnection {
	constructor(connection) {
		this.connection = connection;

		this.onMessage = this.onMessage.bind(this);
		this.onPeerAdded = this.onPeerAdded.bind(this);
		this.onMining = this.onMining.bind(this);
		this.onBlockAdded = this.onBlockAdded.bind(this);
		this.onHashrate = this.onHashrate.bind(this);
		this.onjobCancelled = this.onjobCancelled.bind(this);
		this.onConnecting = this.onConnecting.bind(this);
		this.onSyncing = this.onSyncing.bind(this);
		this.onReady = this.onReady.bind(this);

		this.connection.on('message', this.onMessage);

		bus.on('peer-added', this.onPeerAdded);
		bus.on('mining', this.onMining);
  	bus.on('block', this.onBlockAdded);
  	bus.on('hashrate', this.onHashrate);
  	bus.on('job-cancelled', this.onjobCancelled);
  	bus.on('connecting', this.onConnecting);
  	bus.on('syncing', this.onSyncing);
		bus.on('ready', this.onReady);

  	this.connection.on('close', (reasonCode, description) => {
			bus.removeListener('peer-added', this.onPeerAdded);
  		bus.removeListener('mining', this.onMining);
    	bus.removeListener('block', this.onBlockAdded);
    	bus.removeListener('hashrate', this.onHashrate);
    	bus.removeListener('job-cancelled', this.onjobCancelled);
    	bus.removeListener('connecting', this.onConnecting);
    	bus.removeListener('syncing', this.onSyncing);
  		bus.removeListener('ready', this.onReady);
  		console.log((new Date()) + ' Peer ' + this.connection.remoteAddress + ' disconnected.');
			return;
  	});
	}

	onMessage({type, utf8Data}) {
		if (type === 'utf8') {
    	const request = JSON.parse(utf8Data.toString());
			coreRequests(request).then(data => {
				const { name, type } = request;
				this.connection.send(JSON.stringify({name, data, type}));
			});
		}
	}

	send({name, data, type}) {
		this.connection.send(clientResponse({type, name, data}));
	}

	stateResponse({type = 'status', name, data}) {
  	if (data !== global.states[name]) {
  		global.states[name] = data;
  	}
  	return this.send({type, name, data});
	}

	onPeerAdded(peer) {
		this.send({type: 'network', name: 'peer-added'});
	}

	onMining(data) {
		this.stateResponse({name: 'mining', data});
	}

	onBlockAdded(data) {
  	this.send({type: 'blockchain', name: 'block-added', data});
	}

	onHashrate(data) {
		this.send({type: 'miner', name: 'hashrate', data});
	}

	onjobCancelled(data) {
		this.send({type: 'miner', name: 'job-cancelled', data});
	}

	onConnecting(data) {
		this.stateResponse({name: 'connecting', data});
	}

	onSyncing(data) {
		this.stateResponse({name: 'syncing', data});
	}

	onReady(data) {
		this.stateResponse({name: 'ready', data});
	}
}

export default httpServer => {
	const socketServer = new WebSocketServer({
  	httpServer,
  	autoAcceptConnections: false
	});

	const originIsAllowed = origin => {
  	// put logic here to detect whether the specified origin is allowed.
  	return true;
	};

	socketServer.on('request', request => {
  	if (!originIsAllowed(request.origin)) {
  		// Make sure we only accept requests from an allowed origin
  		request.reject();
  		console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
  		return;
  	}

  	const connection = request.accept('echo-protocol', request.origin);
  	console.log((new Date()) + ' Connection accepted.');
		return new ClientConnection(connection);
	});

};

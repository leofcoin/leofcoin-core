import io from 'socket.io-client';
import EventEmitter from 'events';
import ecdh from 'crypto-ecdh';
import { exists, write } from 'crypto-io-fs';
import { seed, netKeyPath } from './../../params';
// TODO: hardcoded swarm key?
// TODO: replace with websocket

export const initConnection = new Promise((resolve, reject) => {
  const socket = io(seed);

  socket.on('handshake', pubKey => {
    const pair = ecdh('hex');
    pair.derive(pubKey);

    // start a new secure connection using ECDH
    new SecureClientConnection(socket, pair).on('connected', connection => resolve(connection));
  });
});

class SecureClientConnection extends EventEmitter {
  constructor(socket, pair) {
    super();
    // declare properties
    this.id = socket.id;
    this.pair = pair;
    this.socket = socket;
    // bind methods
    this.handshake = this.handshake.bind(this);
    // init listeners & emitters
    this.shake();
  }

  requestKey() {
    return new Promise((resolve, reject) => {
      this.socket.on('_request-key', key => {
        resolve(key);
      });
      this.socket.emit('request-key');
    });
  }

  async shake() {
    this.socket.on('secure-connection', this.handshake);
    this.socket.emit('_handshake', this.pair.public);
  }

  async handshake(cipher) {
    const key = await this.pair.decrypt(cipher);
    // get a new pair
    const pair = ecdh('hex');
    // encrypt our new key
    cipher = await this.pair.encrypt(pair.public);
    this.pair = pair;
    this.pair.derive(key);

    this.socket.on('network', async cipher => {
      const address = await this.pair.decrypt(cipher);
      if (!exists(netKeyPath)) {
        cipher = await this.requestKey();
        const key = await this.pair.decrypt(cipher);
        await write(netKeyPath, key);
      }
      this.emit('connected', {address});
    });
    this.socket.on('address', data => console.log(data));
    this.socket.emit('_secure-connection', cipher.toString());
  }
}

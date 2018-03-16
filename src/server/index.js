import express from 'express';
import cors from 'cors';
import { Server, createServer } from 'http';
import { read } from 'crypto-io-fs';
import { encrypt, decrypt } from 'crypto-io-utils';
import params from './../params';
import wallet from './routes/wallet';
import socketServer from './socket-server';
import { chain } from '../lib/dagchain/dagchain-interface';
// internal server for communicating with system fs
const core = express();
const server = Server(core);
// socket event server
socketServer(server);

core.use(cors({
	origin: 'http://127.0.0.1:2050'
}));

// setup routes
core.use(wallet);

core.get('/core/chain', (request, response) => {
	response.status(200).send(JSON.stringify(chain));
});

server.listen(5005, console.log('listening on 5005'));

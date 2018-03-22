import { DAGNode } from 'ipld-dag-pb';
import { decode, encode } from 'bs58';
import IPFS from 'ipfs-api';
import EventEmitter from 'events';
import { chain, difficulty, getUnspent } from './dagchain-interface';
import { DAGBlock, createDAGNode, validate } from './dagblock';
import { info, succes, log } from 'crypto-logger';
import { read, write } from 'crypto-io-fs';
import { join } from 'path';
import { genesis, localIndex, localCurrent, dagchain } from './../../params';
import { debug, hashFromMultihash, multihashFromHex } from './../../utils';
import bus from './../bus';

// import ipfsKeepAlive from './../../ipfs-keep-alive';
// import bitswap from 'ipfs-bitswap';
// TODO: implement bitswap
export const ipfs = (() => new IPFS())();

export class DAGChain extends EventEmitter {
  get link() {
    return this.name.replace('/ipfs/', '');
  }
  get links() {
    return this.node ? this.node.links : [];
  }
  get index() {
    const links = [];
    this.links.forEach(link => {

      links[link.name] = link;
    });
    return links.length > 0 ? links : [];
  }
  constructor() {
    super();
    this.announceBlock = this.announceBlock.bind(this);

    this.chain = chain;
    this.ipfs = ipfs;

    this.ipfs.pubsub.subscribe('block-added', this.announceBlock);

    this.init();
    // ipfsKeepAlive(params.dagchain);
  }

  async init() {
    try {
      this.name = await this.resolve(dagchain, {recursive: true});
      this.node = await this.get(this.link);      
      info(`Running on the ${process.argv[2]} network`);
      this.loadChain();
    } catch (e) {
      if (process.argv[2] === 'genesis') {
        info(`Creating ${process.argv[2]} block on the ${process.argv[3]} network`);
        this.newDAGChain();
      }
    }
  }
  async resolve(name) {
    return await this.ipfs.name.resolve(name, {recursive: true});
  }

  async get(multihash) {
    return await this.ipfs.object.get(multihash);
  }

  async put(DAGNode) {
    return await this.ipfs.object.put(DAGNode);
  }

  async pin(multihash) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ipfs.pin.add(multihash);
        resolve();
      } catch (e) {
        reject(e)
      }
    });
  }

  /**
   * addLink
   */
  async addLink(multihash, link) {
    const newDAGChain = await this.ipfs.object.patch.addLink(multihash, link);
    return await this.publish(encode(newDAGChain.multihash));
  }

  async lastLink() {
    try {
      await this.sync();
      const height = Number(this.links.length) - 1;
      for (const link of this.links) {
        if (Number(link.name) === height) {
          return link.multihash;
        }
      }
    } catch (e) {
      console.error('Sync Error::', e);
    }
  }
  // TODO: decentralize
  async lastBlock() {
    const lastLink = await this.lastLink();
    return await new DAGBlock(lastLink);
  }

  /**
   * resolves to the latest chainObject
   */
  async sync() {
    this.name = await this.resolve(dagchain);
    this.node = await this.get(this.link);
    return this.link;
  }

  async publish(multihash) {
    const published = await this.ipfs.name.publish(multihash);
    await this.sync();
    await this.pin(published['value']);
    return published['name']  // only needed when creating genesis block
  }

  async syncChain() {
    try {
      bus.emit('syncing', true);
      if (this.index) {
        const { index, prevHash } = await this.localBlock();
        this.index.forEach(async link => {
          const block = await new DAGBlock(link.multihash);
          if (index < block.index) {
            await this.pin(encode(link.multihash)); // pin block locally
            await this.updateLocals(`1220${block.hash}`, block.index);
            console.log(`added block: ${block.index}  ${block.hash}`);
          }
          this.chain[block.index] = block;
          console.log(`loaded block: ${block.index}  ${block.hash}`);
        });
      }
      bus.emit('syncing', false);
    } catch (e) {
      console.error('syncChain', e);
    }

  }

  async localBlock() {
    try {
      const CID = await read(localCurrent, 'string'); // read local chain state
      const multihash = encode(new Buffer(CID, 'hex'));
      const current = await this.get(multihash);
      const { index } = JSON.parse(current.data.toString());
      debug(`current local block CID ${CID}`);
      debug(`current local dag: ${multihash}`);
      return {
        index,
        multihash,
        CID
      }
    } catch (e) {
      const CID = await this.get(encode(new Buffer(genesis, 'hex')));
      console.log(CID);
      await write(localCurrent, CID.multihash.toString('hex'));
      return await this.localBlock();
    }
  }

  async loadChain() {
    await this.syncChain();
    bus.emit('ready', true);
  }

  addBlock(block) {
    return new Promise(async (resolve, reject) => {
      log(`add block: ${block.index}  ${block.hash}`);
      this.chain[block.index] = block;
      bus.emit('block-added', block);
      await this.pin(multihashFromHex(block.hash)); // pin block locally
      await this.updateLocals(`1220${block.hash}`, block.index);
    });
  }
  // TODO: write using ipfs.files.write
  writeLocals(CID, index) {
    return new Promise(async (resolve, reject) => {
      await write(localIndex, JSON.stringify(index));
      await write(localCurrent, CID);
      resolve();
    });
  }

  updateLocals(CID, height) {
    return new Promise(async (resolve, reject) => {
      try {
        const index = await read(localIndex, 'json');
        index.push([height, CID]);
        await this.writeLocals(CID, index);
      } catch (error) {
        await this.writeLocals(CID, [[height, CID]]);
      }
      resolve();
    });
  }

  /**
   * Initialize a new chain on the IPFS network
   * Creates creates & saves the genesisBlock to IPFS, blocks are pinned so they aren't removeable on the local side.
   *
   * @param {object} block The genesis block to write
   * @setup PART of Easy setup your own blockchain, more info URL...
   */
  async newDAGChain() {
    const genesisDAGNode = await this.newGenesisDAGNode(difficulty());
    const block = await this.put(genesisDAGNode);
    await this.pin(encode(block.multihash));
    const chainDAG = await this.ipfs.object.new('unixfs-dir');
    const height = JSON.parse(genesisDAGNode.data.toString()).index;
    const updated = await this.addLink(chainDAG.multihash, {name: height, size: block.size, multihash: block.multihash});
    const CID = block.multihash.toString('hex'); // The CID as an base58 string
    await this.updateLocals(CID, height);
    succes('dag chain created');
    info(`DAGChain name ${updated}`);
    info(`Genesis ${CID}`);
  }

  /**
   * Create a new genesis block
   */
  async newGenesisDAGNode(difficulty) {
    let dagnode;
    const block = {
  		index: 0,
  		prevHash: '0',
  		time: Math.floor(new Date().getTime() / 1000),
  		transactions: [],
  		nonce: 0
  	};

  	dagnode = await createDAGNode(block);
    block.hash = dagnode.multihash.toString('hex').substring(4);
    while (parseInt(block.hash.substring(0, 8), 16) >= difficulty) {
      block.nonce++;
      dagnode = await createDAGNode(block);
      block.hash = dagnode.multihash.toString('hex').substring(4);
    }
    return dagnode;
  }

  // TODO: go with previeus block instead off lastBlock
  // TODO: validate on sync ...
  async announceBlock(announcement) {
    if (announcement.topicIDs[0] === 'block-added') {
      const block = JSON.parse(announcement.data.toString());
      try {
        const lastBlock = chain[chain.length - 1];
        const invalid = await validate(lastBlock, block, difficulty(), getUnspent());
        const dagnode = await new DAGBlock().put(block);
        // await this.sync();
        const updated = await this.addLink(this.link, {name: block.index, size: dagnode.size, multihash: dagnode.multihash});
        this.addBlock(block); // add to running chain
      } catch (error) {
        ipfs.pubsub.publish('invalid-block', new Buffer.from(JSON.stringify(block)));
        bus.emit('invalid-block', block);
        return console.error(error);
      }
    }
  }
}

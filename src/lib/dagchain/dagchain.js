import { DAGNode } from 'ipld-dag-pb';
import { decode, encode } from 'bs58';
import * as IPFS from 'ipfs-api';
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
    for (const link of this.links) {
      links[link.name] = link;
    }
    return links.length > 0 ? links : null;
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
      this.name = await this.resolve(dagchain);
      this.node = await this.get(this.link);

      if (process.argv[2] === 'genesis') {
        info(`Creating ${process.argv[2]} block on the ${process.argv[3]} network`);
        this.newDAGChain();
      } else {
        info(`Running on the ${process.argv[2]} network`);
        this.loadChain();
      }
    } catch (e) {
      this.newDAGChain();
    }
  }
  async resolve(name) {
    return await this.ipfs.name.resolve(name);
  }

  async get(multihash) {
    return await this.ipfs.object.get(multihash);
  }

  async put(DAGNode) {
    return await this.ipfs.object.put(DAGNode);
  }

  async pin(multihash) {
    return await this.ipfs.pin.add(multihash);
  }

  /**
   * addLink
   */
  async addLink(multihash, link) {
    const newDAGChain = await this.ipfs.object.patch.addLink(multihash, link);
    return await this.publish(encode(newDAGChain.multihash));
  }

  async lastLink() {
    await this.sync();
    const height = Number(this.links.length) - 1;
    for (const link of this.links) {
      if (Number(link.name) === height) {
        return link.multihash;
      }
    }
  }

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
    bus.emit('syncing', true);
    const { index, prevHash } = await this.localBlock();

    if (this.index) {
      for (const link of this.index) {
        const block = await new DAGBlock(link.multihash);
        if (index < block.index) {
          await this.pin(encode(link.multihash));
        }
        this.addBlock(block);
      }
    }
    bus.emit('syncing', false);
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
      await write(localCurrent, CID.multihash.toString('hex'));
      return await this.localBlock();
    }
  }

  async loadChain() {
    await this.syncChain();
    bus.emit('ready', true);
  }

  addBlock(block) {
    this.chain.push(block);
    global.chain = this.chain;
    bus.emit('block-added', block);
    console.log(`added block: ${block.index}`);
  }

  async writeLocals(CID, index) {
    await write(localIndex, JSON.stringify(index));
    await write(localCurrent, CID);
    return;
  }

  async updateLocals(CID, height) {
    try {
      const index = await read(localIndex, 'json');
      index.push([height, CID]);
      return await this.writeLocals(CID, index);
    } catch (error) {
      return await this.writeLocals(CID, [[height, CID]]);
    }
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
      try {
        const block = JSON.parse(announcement.data.toString());
        const lastBlock = await this.lastBlock();
        await validate(lastBlock, block, difficulty(), getUnspent());
        const dagnode = await new DAGBlock().put(block);
        await this.sync();
        const updated = await this.addLink(this.link, {name: block.index, size: dagnode.size, multihash: dagnode.multihash});
        await this.pin(encode(dagnode.multihash)); // pin block locally
        const CID = dagnode.multihash.toString('hex'); // The CID as an base58 string
        await this.updateLocals(CID, block.index);
        this.addBlock(block); // add to running chain
      } catch (error) {
        bus.emit('invalid-block', block);
        return console.error(error)
      }
    }
  }
}

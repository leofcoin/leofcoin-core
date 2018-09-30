import { DAGNode } from 'ipld-dag-pb';
import { decode, encode } from 'bs58';
import EventEmitter from 'events';
import { chain, difficulty, getUnspent, longestChain, lastBlock, newGenesisDAGNode } from './dagchain-interface';
import { DAGBlock, createDAGNode, validate } from './dagblock';
import { read, write } from 'crypto-io-fs';
import { join } from 'path';
import { genesis, network, genesisCID, localIndex, localCurrent, localDAGAddress, localDAGMultiaddress, networks } from './../../params';
import { debug, hashFromMultihash, multihashFromHex, succes, log } from './../../utils';
import bus from './../bus';
// import ipfsKeepAlive from './../../ipfs-keep-alive';
// import bitswap from 'ipfs-bitswap';
// TODO: implement bitswap
// export const ipfs = (() => new IPFS())();

export class DAGChain extends EventEmitter {
  get link() {
    return this.name.replace('/ipfs/', '')
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
  constructor({ipfs}) {
    super();
    this.announceBlock = this.announceBlock.bind(this);

    this.chain = chain;
    this.ipfs = ipfs;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ipfs.pubsub.subscribe('block-added', this.announceBlock);
        const { hash } = await longestChain();
        this.name = hash || await localDAGMultiaddress();
        this.node = await this.get(this.link);
        log(`Running on the ${network} network`);
        await this.loadChain();
      } catch (error) {
        // TODO: finishe the genesis module
        if (genesis) {
          log(`Creating genesis block on the ${network} network`);
          await this.newDAGChain();
        } else {
          reject(error)
        }
      }
    });
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
    const { hash } = await longestChain();
    this.name = hash || await localDAGMultiaddress();
    this.node = await this.get(this.link);
    return this.link;
  }

  async publish(multihash) {
    const published = await this.ipfs.name.publish(multihash);
    // if (this.name) {
    //   await this.sync();
    // }
    await this.pin(published['value']);
    return published['name']  // only needed when creating genesis block
  }

  async resolveBlocks(multihash, index) {
    try {
      let block = await new DAGBlock(encode(multihash));
      if (block.index > index) {
        await this.pin(encode(multihash)); // pin block locally
        console.log(`added block: ${block.index}  ${block.hash}`);
      }
      chain[block.index] = block;
      console.log(`loaded block: ${block.index}  ${block.hash}`);
      if (block.prevHash && block.prevHash.length > 3) {
        return this.resolveBlocks(Buffer.from(`1220${block.prevHash}`, 'hex'), index);
      }
      return;
    } catch (e) {
      console.error(e);
    }
  }

  async syncChain() {
    try {
      bus.emit('syncing', true);
      if (this.index) {
        const { index, prevHash } = await this.localBlock();
        await this.sync()
        const height = this.index.length - 1;
        let syncCount = height - index;
        const multihash = this.index[height].multihash;
        log(`syncing ${syncCount} blocks`)
        await this.resolveBlocks(multihash, index);
        await this.updateLocals(multihash.toString('hex'), height, this.link);
        await this.publish(this.link);
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
      const CID = await this.get(encode(new Buffer(genesisCID, 'hex')));
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
      chain[block.index] = block;
      bus.emit('block-added', block);
      await this.sync();
      await this.pin(multihashFromHex(block.hash)); // pin block locally
      await this.updateLocals(`1220${block.hash}`, block.index, this.link);

      try {
        await this.publish(this.link);
      } catch (e) {
        console.warn(e);
      }

      block.transactions.forEach(transaction => {
        const index = mempool.indexOf(transaction)
        mempool.splice(index)
      })
    });
  }
  // TODO: write using ipfs.files.write
  writeLocals(CID, index, DAGAdress) {
    return new Promise(async (resolve, reject) => {
      await write(localIndex, JSON.stringify(index));
      await write(localCurrent, CID);
      await write(localDAGAddress, DAGAdress);
      resolve();
    });
  }

  updateLocals(CID, height, DAGAdress) {
    return new Promise(async (resolve, reject) => {
      try {
        const index = await read(localIndex, 'json');
        index.push([height, CID]);
        await this.writeLocals(CID, index, DAGAdress);
      } catch (error) {
        await this.writeLocals(CID, [[height, CID]], DAGAdress);
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
    try {
      const genesisDAGNode = await newGenesisDAGNode(difficulty());
      const block = await this.put(genesisDAGNode);
      // await this.pin(encode(block.multihash));
      const chainDAG = await this.ipfs.object.new('unixfs-dir');
      const height = JSON.parse(genesisDAGNode.data.toString()).index;
      const newDAGChain = await this.ipfs.object.patch.addLink(chainDAG.multihash, {name: height, size: block.size, multihash: block.multihash});
      const CID = block.multihash.toString('hex'); // The CID as an base58 string
      await this.updateLocals(CID, 0, encode(newDAGChain.multihash))
      succes('genesisBlock created');
      log(`genesisBlock: ${block.data.toString()}`);
      log(`genesis: ${encode(block.data)}\nCID:\t${CID}`);
      log(`DAGChain name ${encode(newDAGChain.multihash)}`);
      return;
    } catch (e) {
      console.error(e);
    }
  }

  async updateLocalChain(block) {
    const dagnode = await new DAGBlock().put(block);
    await this.addLink(this.link, {name: block.index, size: dagnode.size, multihash: dagnode.multihash});
    return;
  }

  // TODO: go with previous block instead off lastBlock
  // TODO: validate on sync ...
  async announceBlock({data, from}) {
      const block = JSON.parse(data.toString());
      try {
        // const previousBlock = await lastBlock(); // test
        await validate(chain[chain.length - 1], block, difficulty(), getUnspent());
        // await this.sync();
        await this.updateLocalChain(block);
        this.addBlock(block); // add to chain
      } catch (error) {
        // TODO: remove publish invalid-block
        this.ipfs.pubsub.publish('invalid-block', new Buffer.from(JSON.stringify(block)));
        bus.emit('invalid-block', block);
        return console.error(error);
      }
    }
}

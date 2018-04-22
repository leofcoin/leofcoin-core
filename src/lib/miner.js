import { config, getDifficulty, hashLog, median } from './../utils';
import { BlockError, TransactionError, MinerWarning } from './errors';
import { StoreHandler } from 'crypto-store';
import { nextBlock, difficulty } from './dagchain/dagchain-interface';
import bus from './bus';
import { fork } from 'child_process';
import { join } from 'path';
import IPFS from 'ipfs-api'
const ipfs = new IPFS();

export default class Miner extends StoreHandler {

  get donationAddress() {
    return 'cpc';
  }

  constructor(address, intensity, autostart) {
    // TODO: limit intensity when pool is empty
    super();
    this.workerPath = join(__dirname, 'miner-worker.js')
    if (!address) {
      MinerWarning('All profit will be donated until address is set');
    }
    this.address = address;
    this.running = 0;


    if (autostart) {
      this.start();
    }
  }

  /**
   * keep node(s) in sync
   */
  onBlockAdded() {
    return new Promise((resolve, reject) => {
      this._onBlockAdded = block => {
        bus.removeListener('block-added', this._onBlockAdded);
        bus.removeListener('invalid-block', this._onBlockInvalid);
        this.mineStop()
        resolve(block);
      }
      this._onBlockInvalid = block => {
        bus.removeListener('block-added', this._onBlockAdded);
        bus.removeListener('invalid-block', this._onBlockInvalid);
        this.mineStop()
        resolve(null);
      }
      bus.once('block-added', this._onBlockAdded);
      bus.once('invalid-block', this._onBlockInvalid);
    });
  }


  async start() {
    // ipfs.pubsub.subscribe('invalid-block');
    this.mining = true;
    this.mine(Math.random().toString(36).slice(-11));
  }

  stop() {
    this.mining = false;
    this.mineStop();
  }

  async mine(job, lastValidBlock) {
    const address = this.address || this.donationAddress;
    const start = Date.now();
    const {block, hashes, index} = await this.mineBlock(difficulty(), address, job);

    if (hashes) {
      const now = Date.now();
      const seconds = (now - start) / 1000;
      const rate = (hashes / seconds) / 1000;
      bus.emit('hashrate', {uid: job, hashrate: (Math.round(rate * 100) / 100)});
    }

    if (block) {
      ipfs.pubsub.publish('block-added', new Buffer(JSON.stringify(block)));
      console.log(`${job}::Whooooop mined block ${block.index}`);
      if (this.mining) {
        await this.onBlockAdded();
        this.mine(job, block);
      }
    } else {
      console.log(`${job}::cancelled mining block ${index}`);
      if (this.mining) this.mine(job);
    }

  }

  /**
   * Mine a block in separate process
   *
   * @param transactions Transactions list to add to the block
   * @param lastBlock Last block in the blockchain
   * @param difficulty Current difficulty
   * @param address Addres for reward transaction
   * @return {*}
   */
  async mineBlock(difficulty, address, job) {
    const block = await nextBlock(address);
    console.log(`${job}::Started mining block ${block.index}`);

    return this.findBlockHash(block, difficulty);
  }

  /**
   * Find block hash according to difficulty
   *
   * @param block
   * @param difficulty
   * @return {Promise}
   */
  findBlockHash (block, difficulty) {
    return new Promise((resolve, reject) => {
      const worker = fork(this.workerPath);
      /*
       * Create worker to find hash in separate process
       */


       /*
        * Hadnle events to stop mining when needed
        */
      this.mineStop = () => {
       removeListeners()
       worker.kill('SIGINT')
       resolve({block: null, hashCount: null, index: block.index});
      }

      // Listeners for stopping mining
      const blockAddedListener = b => {
        if (b.index >= block.index) this.mineStop()
      }
      const mineStopListener = b => this.mineStop
      const removeListeners = () => {
       bus.removeListener('block-added', blockAddedListener)
       bus.removeListener('mine-stop', mineStopListener)
      }
      // If other process found the same block faster, kill current one
      bus.once('block-added', blockAddedListener)
      bus.once('mine-stop', mineStopListener)
      // const result = await minerWorker({block, difficulty})
      worker.on('message', (data) => {
        removeListeners();

        resolve({block: data.block, hashes: data.hashCount});
        worker.kill('SIGINT');
      })
      worker.send({block, difficulty});

    });
  }

}

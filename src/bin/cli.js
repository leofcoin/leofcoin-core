const { genesisBlock } = require('./../lib/blockchain');
const core = require('./../core');;
const block = genesisBlock();
console.log(block.hash, Buffer(JSON.stringify(block)));
switch (process.argv[2]) {
  case 'init':
    const block = genesisBlock();
    ipfs.dag.put(block, {cid: block.hash})
    break;
}

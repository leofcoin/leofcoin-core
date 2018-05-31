import createDAGNode from './dagnode';

export default async block => {
  block = await createDAGNode(block);
  return block.multihash.toString('hex').substring(4);
}

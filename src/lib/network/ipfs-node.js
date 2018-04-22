import REPO from 'ipfs-repo';
import { exists as fileExists, write } from 'crypto-io-fs';
import { unlinkSync } from 'fs';
import { config } from 'repo-configs';
import { networkPath } from '../../params';
import { join } from 'path';
const ipfsRepo = new REPO(networkPath);

const initRepo = () => new Promise(async (resolve, reject) => {
  const { repo, spec } = await config();
  const dataSpecPath = join(networkPath, 'datastore_spec')
  ipfsRepo.init(repo, async error => {
    if (error) reject(error);
    await write(dataSpecPath, JSON.stringify(spec));
    resolve();
  });
})

const prepareRepo = () => new Promise((resolve, reject) => {
  ipfsRepo.exists(async (error, exists) => {
    if (error) reject(error);
    else if (exists) resolve();
    else await initRepo();
    resolve();
  })
});

export const closeRepo = () => new Promise((resolve, reject) => {
  ipfsRepo.close(error => {
    if (error) reject(error);
    resolve()
  })
})

export const cleanRepo = () => new Promise(async (resolve, reject) => {
  console.log(`cleaning repo`);
  try {
    const arr = [
      join(networkPath, 'api'),
      join(networkPath, 'repo.lock')
    ]
    for (const path of arr) {
      const exists = await fileExists(path)
      if (exists) unlinkSync(path)
    }
    resolve();
  } catch (error) {
    reject(error)
  }
})

export const IPFSNode = () => new Promise(async (resolve, reject) => {
  try {
    await prepareRepo();
    const IPFSFactory = require('ipfsd-ctl');
    const f = IPFSFactory.create({type: 'go'});

    return f.spawn({init: false, repoPath: networkPath, disposable: false}, (error, ipfsd) => {
      if (error) { reject(error) }
      return ipfsd.start(['--enable-pubsub-experiment'], error => {
        global.ipfs = ipfsd.api;
        if (error) { reject(error) }
        resolve({ ipfsd });
      });

    });
  } catch (error) {
    reject(error);
  }
});
	// }
// export default (() => IPFSNode())();

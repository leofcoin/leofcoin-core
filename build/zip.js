const zlib = require('zlib');
const gzip = zlib.createGzip();
const fs = require('fs');
const globStream = require('glob-stream');
const npmpackage = fs.readFileSync('./package.json');
const { version } = JSON.parse(npmpackage.toString());
const inp = globStream(['dist/**', '!dist/browser/**', '!dist/dagchain', 'package.json']);
const out = fs.createWriteStream(`leofcoin-core-${version}.npm.gz`);

inp.pipe(gzip).pipe(out);

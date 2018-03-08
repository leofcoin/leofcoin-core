const zlib = require('zlib');
const gzip = zlib.createGzip();
const fs = require('fs');
const inp = fs.createReadStream('core.js');
const out = fs.createWriteStream('core.js.gz');

inp.pipe(gzip).pipe(out);

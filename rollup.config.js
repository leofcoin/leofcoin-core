const readFileSync = require('fs').readFileSync;
const npmPackage = readFileSync('package.json', 'utf8');
const { version, name } = JSON.parse(npmPackage);
const production = Boolean(process.argv[2] === 'production');
export default [
	// ES module version, for modern browsers
	{
		input: ['src/core.js', 'src/lib/workers/miner-worker.js'],
		output: {
			dir: 'dist/module',
			format: 'es',
			sourcemap: true,
			intro: `const ENVIRONMENT = {version: '${version}', production: true};`,
			banner: `/* ${name} version ${version} */`,
			footer: '/* follow Leofcoin on Twitter! @leofcoin */'
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	},

	// CommonJS version, for Node, Browserify & Webpack
	{
		input: ['src/core.js'],
		output: {
			dir: 'dist/commonjs',
			format: 'cjs',
			sourcemap: true,
			intro: `const ENVIRONMENT = {version: '${version}', production: true};`,
			banner: `/* ${name} version ${version} */`,
			footer: '/* follow Leofcoin on Twitter! @leofcoin */'
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	},
	{
		input: ['src/lib/workers/miner-worker.js'],
		output: {
			dir: 'dist/commonjs',
			format: 'cjs',
			sourcemap: false,
			intro: `const ENVIRONMENT = {version: '${version}', production: true};`,
			banner: `/* ${name} version ${version} */`,
			footer: '/* follow Leofcoin on Twitter! @leofcoin */'
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	}
];

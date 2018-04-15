export default [
	// ES module version, for modern browsers
	{
		input: ['src/core.js', 'src/lib/workers/miner-worker.js'],
		output: {
			dir: 'dist/module',
			format: 'es',
			sourcemap: true
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	},

	// SystemJS version, for older browsers
	{
		input: ['src/core.js', 'src/lib/workers/miner-worker.js'],
		output: {
			dir: 'dist/nomodule',
			format: 'system',
			sourcemap: true
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	},

	// SystemJS version, for older browsers
	{
		input: ['src/core.js', 'src/lib/workers/miner-worker.js'],
		output: {
			dir: 'dist/commonjs',
			format: 'cjs',
			sourcemap: true
		},
		experimentalCodeSplitting: true,
		experimentalDynamicImport: true
	}
];

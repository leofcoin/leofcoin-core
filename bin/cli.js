#!/usr/bin/env node

const params = {
	genesis: false,
	dynamic: false,
	network: 'main'
};

for (const param of process.argv) {
	switch (param) {
	case 'init':
	case 'genesis':
		params.genesis = true;
		break;
	case 'olivia':
		params.network = 'olivia';
		break;
		// wether or not to seed ip address to our DynamicSeedDB
	case 'dynamic-seed':
		params.dynamic = true;
		break;
	}
}

const { core } = require('./../dist/commonjs/core.js');

core(params);

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
		options.genesis = true;
		break;
	case 'olivia':
		options.network = 'olivia';
		break;
		// wether or not to seed ip address to our DynamicSeedDB
	case 'dynamic-seed':
		options.dynamic = true;
		break;
	}
}

const { core } = require('./../dist/core.js');

core(params);

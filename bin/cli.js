#!/usr/bin/env node

const params = {
	genesis: false,
	dynamic: false
};

for (const param of process.argv) {
	switch (param) {
	case 'init':
	case 'genesis':
		params.genesis = true;
		break;
	}

}

const { core } = require('./../dist/commonjs/core.js');

core(params);

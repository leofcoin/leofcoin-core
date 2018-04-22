const browserLoader = () => {
	const script = document.createElement('script');
	if ('noModule' in script) {
		script.src = 'dist/module/core.js';
	} else {
		script.src = 'dist/nomodule/core.js';
	}
	document.head.appendChild(script);
};

if(typeof process === 'object') require('./dist/commonjs/core');
else if (typeof window !== 'undefined') browserLoader();
else throw new Error('Unsupported Environment');

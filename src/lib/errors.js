export const BlockError = text => new Error(`Invalid block: ${text}`);


export class TransactionError extends Error {
	constructor() {
		super();
	}
	set message(value) {
		return `Invalid transaction ${value}`;
	}
}

export const MinerWarning = text => new Error(`warning @Miner: ${text}`);

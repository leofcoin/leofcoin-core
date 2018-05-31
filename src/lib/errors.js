const invalid = (name, text) => new Error(`Invalid ${name}: ${text}`);
// TODO: show notification
export const BlockError = text => invalid('block', text);

export const TransactionError = text =>	invalid('transaction', text);

export const MinerWarning = text => new Error(`warning @Miner: ${text}`);

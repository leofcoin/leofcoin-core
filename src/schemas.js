import {object, number, array, string, boolean, validate as _validate} from 'joi';

const block = object().keys({
	index: number(),
	prevHash: string().hex().length(64),
	time: number(),
	transactions: array(),
	nonce: number(),
	hash: string().hex().length(64),
});

const transaction = object().keys({
	id: string().hex().length(64),
	time: number(),
	hash: string().hex().length(64),
	reward: boolean(),
	inputs: array().items(object().keys({
		tx: string().hex().length(64),
		index: number(),
		amount: number(),
		address: string(),
		signature: string().base64(),
	})),
	outputs: array().items(object().keys({
		index: number(),
		amount: number(),
		address: string(),
	})),
});

export const schemas = {
	block,
	transaction,
};

export const validate = (schema, data) => _validate(data, schemas[schema]);

export const isValid = (schema, data) => Boolean(validate(schema, data).error === null);

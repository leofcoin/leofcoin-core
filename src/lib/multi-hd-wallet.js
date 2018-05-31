import { encode, decode } from 'bs58';
import HDWallet from './hd-wallet';
import MultiSignature from 'multi-signature';

export default class MultiHDWallet extends HDWallet {
	constructor(network, hdnode) {
		super(network, hdnode);
		this.multiCodec = this.network.multiCodec;
		this.version = 0x00;
	}

	get privateKey() {
		return this.save();
	}

	get publicKeyBuffer() {
		return this.hdnode.neutered().getPublicKeyBuffer();
	}

	get publicKey() {
		return this.hdnode.neutered().toBase58();
	}

	get address() {
		return this.hdnode.getAddress();
	}

	export() {
		return this.encode();
	}

	import(multiWIF) {
		const buffer = this.decode(multiWIF);
		this.load(encode(buffer));
	}

	encode() {
		const base58 = this.save();
		const buffer = Buffer.concat([
			Buffer.from(this.version.toString()),
			Buffer.from(this.multiCodec.toString()),
			Buffer.from(decode(base58))
		]);
		return encode(buffer);
	}

	decode(base58) {
		const buffer = decode(base58);
		const version = parseInt(buffer.slice(0, 1));
		const codec = parseInt(buffer.slice(1, 5));
		const data = buffer.slice(5, buffer.length);
		if (version !== this.version) throw TypeError('Invalid version');
		if (this.multiCodec !== codec) throw TypeError('Invalid multiCodec');
		return data;
	}

	sign(hash, address) {
		if (!address) {
			address = this.address;
		}
		return new MultiSignature(this.version, this.network.multiCodec)
			.sign(hash, address);
	}

	verify(multiSignature, hash, address) {
		return new MultiSignature(this.version, this.network.multiCodec)
			.verify(multiSignature, hash, address);
	}

	derive(path) {
		return new MultiHDWallet(this.network, this.hdnode.derivePath(path));
	}
}

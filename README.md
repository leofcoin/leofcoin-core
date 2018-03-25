# leofcoin-core
> A Javascript based blockchain

## Introduction
Easy to use library containing our blockchain & some other handy dandy.

## Features 
- Fast block times 10 seconds or faster when network is under load (more info soon)
- DynamicSeedNodes so everyone can run a "masternode" (less payout then static node) (wip, LIP)
- Fast Sync (Get started "almost" in an instant) (dagchain)
- DDOS proof services

## Info
Hardcoded to the Olivia (testnet) network untill further notice or even offial release.

## How does it work
- starts daemon
- gui waits 15 seconds for peer connections before continueing when none found
- searches the longest chain and starts syncing using the chain.links names (block hashes)

## Developers
### Starting core in devmode
Never wait for builds again,
install @std (local or global)
then run 
```sh
npm run dev
```
### Packaging core for browser
When using core in the browser we need to package it with browserify, 
this will give us a file containing our code with all the dependencies inline.

#### Trigger build & package nodes for browser.
```sh
npm run package
```
you can also package modules manually
```sh
browserify lib/wallet.js --standalone CryptoWallet > lib/browser/wallet.js
```

*** Note that some packages require extra steps for when a user want to run local without a web server, this is accomplished by inserting the code in a html script tag. ***

### Building core for node
```sh
npm run build
```

### Serving
```sh
npm run start
```

## TODO
- ~~Miner support~~
- ~~Wallet support~~
- Send / Receive transactions
- Explorer
- Pool mining
- Settings
- GPU mining support
- Multi wallet support
- HD addresses
- Ignore masterseed when its offline (the peer bootstrap contains default and reputationed* peer addresses)


\*reputationed: Peers are sorted by their reputation (time online, blockshares, bandwidth, etc)


## Projects using leofcoin-core

#### Community
-

#### crypto-io
Projects made by crypto-io, contains wallet, paperWallet, miner etc

- crypto-paper-Wallet
- crypto-wallet

## License

MIT © [Leofcoin](https://github.com/leofcoin)

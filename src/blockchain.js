/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                let newHeight = self.height + 1;
                block.height = newHeight;
                block.time = new Date().getTime().toString().slice(0,-3);
                if (self.height > 0) {
                    block.previousBlockHash = self.chain[self.height].hash;
                }
                block.hash = SHA256(JSON.stringify(block)).toString();
                self.chain.push(block);
                self.height = newHeight;
                resolve(block);
            } catch (error) {
                reject(Error, 'An error occured during the block creation.');
            }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            let message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`
            resolve(message)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let message_time = parseInt(message.split(':')[1]);
            let current_time = parseInt(new Date().getTime().toString().slice(0,-3));
            let spend_time = current_time - message_time;
            if (spend_time >= 300) {
                reject(new Error('Time out.'))
            } else if (!bitcoinMessage.verify(message, address, signature)) {
                reject(new Error('Message invalid.'))
            };
            let block = new BlockClass.Block({star});
            block = await self._addBlock(block);
            resolve(block);
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.hash === hash)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            try {
                self.chain.forEach((block) => {
                    block
                    .getBData()
                    .then((blockDecoded) => {
                        if (blockDecoded && blockDecoded.owner === address) {
                            stars.push(blockDecoded)
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                    })
                })
            } catch (error) {
                reject(Error, 'An error occured during the query.');
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            let currentHeight = await self.getChainHeight();
            try {
                if (currentHeight > 0 ) {
                    self.chain.forEach((block) => {
                        // let blockValid = await block.validate();
                        let blockValid = block.validate();
                        if (!blockValid) {
                            errorLog.push('Block ' + block.height + ' is invalid.')
                        }
                    })
    
                    if (!errorLog) {
                        resolve('Chain is valid.');
                    } else {
                        resolve(errorLog);
                    }
                } else {
                    resolve('Current chain height equals to zero.')
                }
            } catch (error) {
                reject(Error, 'An error occured during the chain validation.');
            }
        });
    }

}

module.exports.Blockchain = Blockchain;   
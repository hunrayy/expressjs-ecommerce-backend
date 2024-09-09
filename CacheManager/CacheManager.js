// cacheManager.js
const NodeCache = require('node-cache');

class CacheManager {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 0 }); // Cache TTL set to never expire
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }
}

module.exports = new CacheManager();

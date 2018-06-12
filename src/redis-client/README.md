# redis client

```javascript
const redisClient = Redis.getNewClient(REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)

redisClient.on('error', (err) => {
  console.log('redis client error...', err)
})

// example of a queue using redis

const Message = require("../models/message")

const {
  REDIS_DEFFERED_PREFIX,
  REDIS_DEFFERED_FETCH_LIMIT,
  LOG_FORMAT,
  LOG_MIN_LEVEL
} = process.env

class Queue {
  constructor() {
    this.redis = Redis.getNewClient(REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
    this.prefix = REDIS_DEFFERED_PREFIX || "scheduler"
  }

  enqueue(m) {
    const self = this
    const message = new Message(m)

    if (!message.isValid()) {
      throw new Error(`Queue.Enqueue: message is not valid: ${JSON.stringify(message)}`)
    }

    const ttlKey = `${self.prefix}_ttl_${message.getId()}`
    const listKey = `${self.prefix}_lset_${message.getId()}`
    const zsetKey = self.prefix

    //Get the TTL for the message
    self.redis.Client.get(ttlKey, (err, ttl) => {
      if (err) {
        throw err
      }

      let defer = message.getDeferredTimestamp()

      //If no TTL move on, else if ttl < message timestamp, replace with TTL
      //then if current message ttl timestamp is still less than curren value, replace
      if (ttl) {
        if (ttl < defer) {
          defer = ttl
        }
      }

      if (message.ttl) {
        if (message.getTTLTimestamp() < defer) {
          defer = message.getTTLTimestamp()
        }
      }

      //Add item to zset used for polling items to send back into Kafka
      self.redis.Client.zadd(zsetKey, defer, message.getId(),
        (err, response) => {
          if (err) {
            throw err
          }

          //if batch, push the item onto the list, else pop the item existing there off,
          //then push the new one on
          if (message.shouldBatch()) {
            self.redis.Client.lpush(
              listKey,
              message.getSerializedOriginalMessages(), (batchErr, batchRes) => { if (batchErr){ throw batchErr }}
            )
          } else {
            self.redis.Client.lpop(`${listKey}`, (popErr, popRes) => { if (popErr){ throw popErr }})
            self.redis.Client.lpush( `${listKey}`, message.getSerializedOriginalMessages(), (nonBatchErr, nonBatchRes) => { if (nonBatchErr){ throw nonBatchErr } })
          }

          //add TTL if we didnt find one in redis already and the message contains one
          if (message.getTTL() > 0 && !ttl) {
            self.redis.Client.setnx(`${ttlKey}`, message.getTTLTimestamp(), (ttlErr, ttlRes) => { if (ttlErr) { throw ttlErr } })
          }
        }
      })
    })
  }

  dequeue(ts, cb){
    const self = this

    const zsetKey = self.prefix
    //Get items from zset by their timestamp "scores"
    this.redis.Client.zrangebyscore(
      zsetKey, 
      -1,
      ts,
      "LIMIT",
      0,
      REDIS_DEFFERED_FETCH_LIMIT || 5000,
      (err, response) => {
        if (err) { throw err }
        if (!response || !response.length) { return }

        let delKeys = []
        let zRemKeys = []
        let multiGet = self.redis.Client.multi()

        for (let key of response) {
          const ttlKey = `${self.prefix}_ttl_${key}`
          const listKey = `${self.prefix}_lset_${key}`
          delKeys.push(listKey)
          delKeys.push(ttlKey)
          zRemKeys.push(key)
          multiGet.lrange(listKey, 0, -1)
        }
        multiGet.exec(function (multiErr, replies) {
          let messageBundles = []
          if (multiErr){ throw multiErr }
          for (let r of replies) {
            const reversed = r.reverse()
            let bunch = []
            for(let inner of reversed) {
              const parsed = JSON.parse(Buffer.from(inner, 'base64').toString())
              bunch.push(parsed)
            }
            messageBundles.push(bunch)
          }
          let finalMessages = []
          for (let m of messageBundles) {
            let b = []
            for (let inner of m) {
              b.push(...inner.messages)
            }
            let saveMessage = m[0]
            saveMessage.messages = b
            finalMessages.push(saveMessage)
          }
          self.redis.Client.zrem(zsetKey, ...zRemKeys)
          self.redis.Client.del(delKeys)
          cb(finalMessages)
      })
    })
  }
}

export default Queue
```
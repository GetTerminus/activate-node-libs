const kafka = require('kafka-node')

class KafkaClient {
  static getNewProducer({
    // Configuration for when to consider a message as acknowledged, default 1
    requireAcks = 1,
    // The amount of time in milliseconds to wait for all acks before considered, default 100ms
    ackTimeoutMs = 100,
    // Partitioner type (default = 0, random = 1, cyclic = 2, keyed = 3, custom = 4), default 2
    partitionerType = 3,
    // Kafka host
    kafkaHost = 'kafka:9092'
  }) {
    // Create kafka client
    const kClient = new kafka.KafkaClient({ kafkaHost })
    const producer = new kafka.HighLevelProducer(kClient, { requireAcks, ackTimeoutMs, partitionerType })

    // Return wrapper around producer, including a refresh function
    return {
      send: producer.send.bind(producer),
      defer: (messagesToDefer = [], options = {}, cb = () => console.log('message(s) sent!')) => {
        const {
          topic = 'messages.defer',
          identifier,
          delay = 300, // seconds to move the sliding window
          batch = false,
          ttl = -1
        } = options

        if (!messagesToDefer || !Array.isArray(messagesToDefer) || messagesToDefer.length < 1 || !identifier) {
          console.log('deferred message params', messagesToDefer, options)
          throw new Error('Invalid deferred message params')
        }

        // if no ttl, just send immediately
        if (ttl < 1) {
          return producer.send(messagesToDefer, cb)
        }

        const deferredMsg = [{
          topic,
          messages: [{
            identifier,
            delay,
            messages: messagesToDefer,
            batch,
            ttl
          }]
        }]

        return producer.send(deferredMsg, cb)
      },
      on: producer.on.bind(producer),
      close: producer.close.bind(producer),
      refresh: kClient.refreshMetadata.bind(kClient)
    }
  }

  static getNewConsumer({
    // accepts either an array of topics or comma delimited string of topics
    topics = null,
    kafkaHost = 'localhost:9092',
    consumerGroupId = 'kafka-node',
    // Auto commit messages or not
    autoCommit = true,
    // An array of partition assignment protocols ordered by preference.
    // 'roundrobin' or 'range' string for built-ins
    protocol = ['roundrobin'],
    fromOffset = 'none',
    // asyncPush = false,
    autoCommitIntervalMs = 5000,
    fetchMaxWaitMs = 100,
    // minimum number of bytes of messages that must be available to give a response
    fetchMinBytes = 1,
    // maximum bytes to include in the message set for this partition
    fetchMaxBytes = 1024 * 1024,
    // If set to 'buffer', values will be returned as raw buffer objects.
    encoding = 'utf8'
  }) {
    if (!topics || topics.length < 1) {
      throw new Error('Unable to create consumer group. No topics provided.')
    }

    const topicsToConsume = typeof topics === 'string' ? topics.split(',') : topics

    const opts = {
      kafkaHost,
      groupId: consumerGroupId,
      autoCommit,
      protocol,
      fromOffset,
      autoCommitIntervalMs,
      fetchMaxBytes,
      fetchMaxWaitMs,
      encoding,
      fetchMinBytes
    }

    return new kafka.ConsumerGroup(opts, topicsToConsume)
  }
}

module.exports = KafkaClient

# Kafka Node Client

This is a high level abstraction over [kafka-node](https://github.com/SOHU-Co/kafka-node). It provides
a succint api for creating Kafka producers and consumers.

## API

### `Kafka.getNewProducer(ProducerOptions = {})`

Returns a [kafka producer](https://github.com/SOHU-Co/kafka-node#highlevelproducer) that you can use to send messages.

#### `ProducerOptions`
```javascript
// Configuration for when to consider a message as acknowledged, default 1
requireAcks = 1,
// The amount of time in milliseconds to wait for all acks before considered, default 100ms
ackTimeoutMs = 100,
// Partitioner type (default = 0, random = 1, cyclic = 2, keyed = 3, custom = 4), default 2
partitionerType = 3,
// Kafka connection string
kafkaHost = 'kafka:9092'
```

```javascript
const Producer = Kafka.getNewProducer({
  zkHost: ZOOKEEPER_HOST,
  topics: ['text.topic']
})

Producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.')
})

Producer.on('error', (err) => {
  console.log('error:', err)
})

const record = [
  {
    topic: 'test.topic',
    messages: [JSON.stringify({ text: 'test!' })],
    attributes: 1 // Use GZip compression for the payload
  }
]

Producer.send(record, () => console.log('message sent'))

const deferredOpts = {
  topic = 'defer_messages', // default is 'defer_messages'
  identifier: 'foobar-id', // required
  delay: 200 // seconds,
  ttl: -1 // no ttl,
  batch = false
}

Producer.defer(record, deferredOpts, () => console.log('deferred message sent'))
```

### `Kafka.getNewConsumer(ConsumerOptions = {})`

Configures and returns a [ConsumerGroup](https://github.com/SOHU-Co/kafka-node#consumergroup) that reads messages off of a topic.

#### `ConsumerOptions`
```javascript
// accepts either an array of topics or comma delimited string of topics
topics = null,
kafkaHost = 'localhost:9092',
consumerGroupId = 'ConsumerGroup1',
// Auto commit messages or not
autoCommit = true,
// An array of partition assignment protocols ordered by preference.
// 'roundrobin' or 'range' string for built-ins
protocol = ['roundrobin'],
fromOffset = 'latest',
autoCommitIntervalMs = 5000,
fetchMaxWaitMs = 100,
// minimum number of bytes of messages that must be available to give a response
fetchMinBytes = 1,
// maximum bytes to include in the message set for this partition
fetchMaxBytes = 1024 * 1024,
// If set to 'buffer', values will be returned as raw buffer objects.
encoding = 'utf8'
```

```javascript
const Consumer = Kafka.getNewConsumer({
  topics: CONSUMER_TOPICS,
  consumerGroupId: `consumer-v1-${uuid.v4()}`,
  kafkaHost: KAFKA_HOST
})

Consumer.on('message', (message) => {
  console.log('message received!', message)
  return
})

Consumer.on('error', err => console.log(err))
```

## Basic example

```javascript
const Kafka = require('kafka-client')

const KAFKA_HOST = 'kafka01:9092,kafka02:9092,kafka03:9092'
const CONSUMER_TOPICS = 'example.topic'

const Producer = Kafka.getNewProducer({
  kafkaHost: KAFKA_HOST
})

Producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.')
})

Producer.on('error', (err) => {
  console.log('error:', err)
})

const Consumer = Kafka.getNewConsumer({
  topics: CONSUMER_TOPICS,
  consumerGroupId: 'consumer-v1',
  kafkaHost: KAFKA_HOST
})

Consumer.on('message', (message) => {
  console.log('message received!', message)
  return
})

Consumer.on('error', err => console.log(err))

// cleans up kafka consumer group
const cleanUp = () => {
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      Consumer.close(true, () => {
        console.log('Kafka consumer group closed.')
        process.exit()
      })
    })
  })
}

cleanUp()
```

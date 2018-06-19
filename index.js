const KafkaClient = require('./src/kafka-client')
const SerialKafkaConsumer = require('./src/kafka-client/serialKafkaConsumer')
const Logger = require('./src/logger')
const RedisClient = require('./src/redis-client')

module.exports = {
  KafkaClient,
  Logger,
  RedisClient,
  SerialKafkaConsumer
}

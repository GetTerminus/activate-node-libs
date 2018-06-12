const KafkaClient = require('./src/kafka-client')
const Logger = require('./src/logger')
const RedisClient = require('./src/redis-client')

module.exports = {
  KafkaClient,
  Logger,
  RedisClient
}

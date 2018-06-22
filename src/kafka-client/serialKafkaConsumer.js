const EventEmitter = require('events')
const _ = require('lodash')
const async = require('async')
const kafka = require('kafka-node')

// Size constants
const KB = 1024

// Events emitted
// ready -> ()
// error -> (error)
// connect -> ()
// nack -> (message)
// ack -> (message)
// message -> (message)
// close -> ()

class SerialKafkaConsumer extends EventEmitter {
  constructor({
    topics = null,
    host = 'localhost:9092',
    groupId = 'kafka-node',
    autoCommit = true,
    protocol = ['roundrobin'],
    fromOffset = 'latest',
    autoCommitInterval = 5000,
    fetchMaxWait = 100,
    fetchMinBytes = 1,
    fetchMaxBytes = 50 * KB,
    encoding = 'utf8'
  }, I = null) {
    super()

    // Check to make sure we actually have topics, otherwise we can't do anything
    if (!topics || topics.length < 1) {
      throw new Error('Unable to create consumer group. No topics provided.')
    }

    // If topics was supplied as a string, turn into array
    if (typeof topics === 'string') {
      this.topics = topics.split(',')
    } else {
      this.topics = topics.map((topic) => topic.split(',')).reduce((a, v) => a.concat(v), [])
    }

    // Set Instrumental object
    this.I = I

    // Create consumer group options
    this.options = {
      kafkaHost: host,
      groupId,
      autoCommit,
      protocol,
      fromOffset,
      autoCommitIntervalMs: autoCommitInterval,
      fetchMaxBytes,
      fetchMaxWaitMs: fetchMaxWait,
      fetchMinBytes,
      encoding
    }

    // Create consumer group
    this.consumerGroup = new kafka.ConsumerGroup(this.options, this.topics)

    // Create synchronous message queue
    this.queue = async.queue((task, callback) => {
      setImmediate(() => this.processMessage(task, callback))
    }, 1)
    this.queue.pause()
    this.queue.drain = () => {
      this.consumerGroup.resume()
    }
    this.queue.saturated = () => {
      this.consumerGroup.pause()
    }

    // Emit the ready event, but make sure to only do it once (set to noop after first emit)
    this._emitReady = () => {
      this.emit('ready')
      this._emitReady = _.noop
    }

    // Start listening for consumer events
    this.connected = false
    this.initListeners()

    // Refresh metadata, cause seems to be a necessity
    this.ready = false
    this.refreshed = false
    this.refresh((err) => {
      if (!err) {
        this.refreshed = true
        if (this.refreshed && this.connected) {
          this.ready = true
          this._emitReady()
        }
      }
    })
  }

  _increment(topic, group, type) {
    if (this.I) {
      this.I.increment(`${topic}.${group}.${type}`)
    }
  }

  on(type) {
    super.on.apply(this, arguments)
    if (type === 'message') {
      this.queue.resume()
    }
  }

  onError(err) {
    if (Array.isArray(err)) {
      err = { name: 'ConsumerError', message: err.join(';') }
    }
    this.emit('error', err)
  }

  // Once connected, set connected to true, and if already refreshed, emit ready event (first time)
  onConnect() {
    this.connected = true
    this.emit('connect')
    if (this.refreshed && this.connected) {
      this.ready = true
      this._emitReady()
    }
  }

  // Push incoming messages onto our internal buffer and immediately pause the kafkaclient
  onMessage(message) {
    // this.consumerGroup.pause()
    if (message) {
      this._increment(message.topic, this.options.groupId, 'consumed')
      this.queue.push(message, _.noop)
    }
  }

  // Emitted once kafka has finished its batch collect, start sending messages to consumers synchronously
  onDone() {
  }

  // Starts up the callbacks for the various consumer group events
  initListeners() {
    this.consumerGroup.on('error', this.onError.bind(this))
    this.consumerGroup.on('connect', this.onConnect.bind(this))
    this.consumerGroup.on('message', this.onMessage.bind(this))
    this.consumerGroup.on('done', this.onDone.bind(this))
    this.on('removeListener', (event) => {
      if (event === 'message' && this.listenerCount() === 0) {
        this.queue.pause()
      }
    })
  }

  // Refreshes the clients metadata, seems to be necessary the first time
  refresh(cb) {
    this.consumerGroup.client.refreshMetadata(this.topics, (err) => {
      if (err) {
        this.onError(err)
      }
      cb(err)
    })
  }

  // The message succeeded, emit ack event and keep going
  ack(msg, cb) {
    return () => {
      this._increment(msg.topic, this.options.groupId, 'ack')
      this.emit('ack', msg)
      cb()
    }
  }

  // The message failed, emit nack event and keep going
  nack(msg, cb) {
    return (err) => {
      this._increment(msg.topic, this.options.groupId, 'nack')
      this.emit('nack', { message: msg, error: err })
      cb()
    }
  }

  // processes each message in our queue, emiting them to our listeners
  processMessage(message, callback) {
    const copy = Object.assign({}, message)
    copy.ack = this.ack(copy, callback).bind(this)
    copy.nack = this.nack(copy, callback).bind(this)
    this.emit('message', copy)
  }

  // Gracefully close the consumer group
  close(callback) {
    const cb = callback || _.noop
    this.consumerGroup.close(false, (err) => {
      if (err) {
        this.onError(err)
      }
      cb(this.buffer)
      this.emit('close')
    })
  }

}

module.exports = SerialKafkaConsumer

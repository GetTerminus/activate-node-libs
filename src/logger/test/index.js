const Logger = require('../index')

describe('Logger', function() {
  describe('#log', function() {
    let logger = new Logger({ minLevel: 'INFO', format: 'TEXT' })

    it('should NOT write a debug log to the console', function(done) {
      logger.log('DEBUG', 'Some debug message')
      done()
    })

    it('should write a debug log to the console', function(done) {
      logger = new Logger({ minLevel: 'DEBUG', format: 'TEXT' })
      logger.log('DEBUG', 'Some debug message')
      done()
    })

    it('should NOT write a debug message with extra data', function(done) {
      logger.log('INFO', 'Some info message', { hello: 'world' })
      done()
    })

    it('should write a debug message with extra data', function(done) {
      logger.log('DEBUG', 'Some info message', { hello: 'world' })
      done()
    })
  })

  describe('#debug', function() {
    let logger = new Logger()

    it('should write a debug level log to console', function(done) {
      logger.debug('Some debug message')
      done()
    })
  })

  describe('#info', function() {
    let logger = new Logger()

    it('should write a info level log to console', function(done) {
      logger.info('Some info message')
      done()
    })
  })

  describe('#warn', function() {
    let logger = new Logger()

    it('should write a warn level log to console', function(done) {
      logger.warn('Some warn message')
      done()
    })
  })

  describe('#error', function() {
    let logger = new Logger()

    it('should write a error level log to console', function(done) {
      logger.error('Some error message')
      done()
    })
  })

  describe('#on.log', function() {
    let logger = new Logger()

    it('should get events from the log emitter', function(done) {
      let timer = setTimeout(function() {
        done(new Error('log event never emitted'))
      }, 1000)
      logger.on('log', function(log) {
        if (!log || !log.message) {
          done(new Error('invalid log'))
        } else {
          console.log('it worked')
          done()
        }
        clearTimeout(timer)
      })
      logger.info('Some info message')
    })
  })
})
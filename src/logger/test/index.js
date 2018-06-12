const Logger = require('../index')

/* eslint-disable no-undef */

describe('Logger', () => {
  describe('#log', () => {
    let logger = new Logger({ minLevel: 'INFO', format: 'TEXT' })

    it('should NOT write a debug log to the console', (done) => {
      logger.log('DEBUG', 'Some debug message')
      done()
    })

    it('should write a debug log to the console', (done) => {
      logger = new Logger({ minLevel: 'DEBUG', format: 'TEXT' })
      logger.log('DEBUG', 'Some debug message')
      done()
    })

    it('should NOT write a debug message with extra data', (done) => {
      logger.log('INFO', 'Some info message', { hello: 'world' })
      done()
    })

    it('should write a debug message with extra data', (done) => {
      logger.log('DEBUG', 'Some info message', { hello: 'world' })
      done()
    })
  })

  describe('#debug', () => {
    const logger = new Logger()

    it('should write a debug level log to console', (done) => {
      logger.debug('Some debug message')
      done()
    })
  })

  describe('#info', () => {
    const logger = new Logger()

    it('should write a info level log to console', (done) => {
      logger.info('Some info message')
      done()
    })
  })

  describe('#warn', () => {
    const logger = new Logger()

    it('should write a warn level log to console', (done) => {
      logger.warn('Some warn message')
      done()
    })
  })

  describe('#error', () => {
    const logger = new Logger()

    it('should write a error level log to console', (done) => {
      logger.error('Some error message')
      done()
    })
  })

  describe('#on.log', () => {
    let logger = new Logger()

    it('should get events from the log emitter', (done) => {
      const timer = setTimeout(() => {
        done(new Error('log event never emitted'))
      }, 1000)
      logger.on('log', (log) => {
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

/* eslint-enable no-undef */

const { Writable } = require('stream')
const moment = require('moment')
const chalk = require('chalk')

const LOG_LEVELS = { DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 }
const DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS'
const ORIGINAL_STD_OUT_WRITE = process.stdout.write.bind(process.stdout)

const DEFAULT_LOG_OPTIONS = {
  minLevel: 'DEBUG',
  format: 'JSON',
  interceptVendorLogs: false
}

class Log {
  constructor(logger, initData) {
    this.logger = logger

    this.data = Object.assign({}, initData)
  }

  withField(key, val) {
    this.data[key] = val
    return this
  }

  withError(err) {
    this.data.error = err
    return this
  }

  debug(message) {
    this.logger.write({ level: 'DEBUG', message, data: this.data, timestamp: moment().valueOf() })
  }

  info(message) {
    this.logger.write({ level: 'INFO', message, data: this.data, timestamp: moment().valueOf() })
  }

  warn(message) {
    this.logger.write({ level: 'WARN', message, data: this.data, timestamp: moment().valueOf() })
  }

  error(message, err) {
    this.logger.write({ level: 'ERROR', message, data: Object.assign({}, this.data, { error: err }), timestamp: moment().valueOf() })
  }
}

class Logger extends Writable {
  constructor(options) {
    super({ objectMode: true })
    this.options = Object.assign({}, DEFAULT_LOG_OPTIONS, options)
    if (this.options.interceptVendorLogs) {
      this._interceptVendorLogs()
    }
  }

  _interceptVendorLogs() {
    process.stdout.write = (text) => {
      this.debug(text.replace('\n', ''))
    }
  }

  _coloredLevel(level) {
    switch (level) {
      case 'DEBUG':
        return chalk.magenta
      case 'INFO':
        return chalk.cyan
      case 'WARN':
        return chalk.yellow
      case 'ERROR':
        return chalk.red
      default:
        return chalk.cyan
    }
  }

  _format(msg) {
    /* eslint-disable no-case-declarations */
    switch (this.options.format) {
      case 'JSON':
        return JSON.stringify(msg)
      case 'TEXT':
        const timestamp = chalk.greenBright(moment(msg.timestamp).format(DATE_TIME_FORMAT))
        const levelColor = this._coloredLevel(msg.level)
        let ret = `[${timestamp}] ${levelColor(msg.level)} ${levelColor('MSG:')} ${levelColor(msg.message)}`
        if (msg.data && msg.data.error) {
          ret = `${ret}\n\t${chalk.red(`${msg.data.error.name}: ${msg.data.error.message}`)}`
        }
        if (msg.level === 'DEBUG' && msg.data) {
          ret = `${ret}${Object.keys(msg.data).map(k => `\n\t${chalk.blue(`${k}:`)} ${JSON.stringify(msg.data[k])}`).join('')}`
        }
        return ret
      default:
        return msg.toString()
    }
    /* eslint-enable no-case-declarations */
  }

  _write(log, encoding, done) {
    if (LOG_LEVELS[log.level] >= LOG_LEVELS[this.options.minLevel]) {
      const msg = this._format(log)
      ORIGINAL_STD_OUT_WRITE(`${msg}\n`) // eslint-disable-line new-cap
      this.emit('log', log)
    }
    done()
  }

  withField(key, val) {
    return new Log(this, { [key]: val })
  }

  withError(err) {
    return new Log(this, { error: err })
  }

  log(level, message, data) {
    this.write({ level, message, data, timestamp: moment().valueOf() })
  }

  debug(message) {
    this.log('DEBUG', message)
  }

  info(message) {
    this.log('INFO', message)
  }

  warn(message) {
    this.log('WARN', message)
  }

  error(message, err) {
    this.log('ERROR', message, { error: err })
  }
}

module.exports = Logger

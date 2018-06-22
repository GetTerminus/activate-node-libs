# Logger

## Honeybadger

Supports [Honeybadger](https://www.honeybadger.io/) error logging. You can pass in honey badger options via the constructor or you can set
`process.env.HONEYBADGER_API_KEY` and all error logs will be sent to honey badger.

## Example

```javascript
import Logger from 'logger' // ALT: const Logger = require('logger')

// Instance methods
const logger = new Logger({
  // The minimum level which will be output to the console
  minLevel: 'DEBUG', // OPTIONS: DEBUG | INFO | WARN | ERROR; DEFAULT: DEBUG
  
  // The format of the outputted logs
  format: 'JSON', // OPTIONS: JSON | TEXT; DEFAULT: JSON
  
  // Whether or not to capture all vendor logs (logs written to stdout), and re-log them at debug level
  interceptVendorLogs: false // OPTIONS: true | false
})

// Log at debug levels
logger.debug('Some debug message')
// JSON => { "level": "DEBUG", "timestamp": <unix-timestamp>, "message": "Some debug message", data: [...anyOtherData] }
// TEXT => [YYYY-MM-DDTHH:mm:ss.SSS] DEBUG MSG: Some debug message
//             ...anyOtherData

// Log at info level
logger.info('Some info message')

// Log at warn level
logger.warn('Some warn message')

// Log at error level
logger.error('Some error message', err, honebadgerMetadata)

// Log at any level
logger.log('DEBUG', 'Some message', otherData)

// Listen to log events (in case for whatever reason you need to listen to the log stream)
logger.on('log', (log) => {
  console.log(log)
  //=> { "level": "DEBUG", "timestamp": <unix-timestamp>, "message": "Some debug message", data: {...data} }
});

// Static methods, using a default logger
Logger.debug('Some debug message')
Logger.info('Some info message')
Logger.warn('Some warn message')
Logger.error('Some error message')

// Adding data to any log with chaining
logger.withField("key", value).withField("key2", value2).withError(err).warn("Can finally be logged at any level.")

```

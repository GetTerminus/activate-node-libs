const redis = require('redis')

class Redis {
  static getNewClient(hostStr, portStr, passwordStr) {
    const iPort = parseInt(portStr, 10)
    this.Client = redis.createClient({
      port: iPort,
      host: hostStr,
      options: {
        password: passwordStr
      }
    })

    // Return wrapper the redis client for simple access to functions we want to expose
    return {
      shutdown: this.Client.quit()
    }
  }
}

module.exports = Redis

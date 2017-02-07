var server = null,
    starting = false,
    killing = false,
    onClose = null,
    debug = process.env.NODE_ENV === 'development' ? true : false

var fs = require('fs')
var Path = require('path')
var spawn = require('child_process').spawn
var psTree = require('ps-tree')

var logger = null
var log = function() {
  if (logger) {
    logger.apply(null, arguments)
  } else {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; ++i) {
      // i is always valid index in the arguments object
      args[i] = arguments[i]
    }
    console.log.apply(console, ['%cproxy', 'color: blue'].concat([].slice.call(args)))
  }
}

var resetProxy = function() {
  killing = false
  starting = false
  server = null
}

var kill = function(pid, signal, cb) {
  if (killing) {
    return
  }

  log('starting kill', pid, signal, server)

  server.on('close', function(code) {
    resetProxy()
    if (cb) {
      cb()
    }
  })

  signal = signal || 'SIGKILL'
  if (process.platform === 'win32') {
    try {
      process.kill(pid, signal)
    } catch (ex) {
      log('process.kill err', pid, signal, ex)
    }
  } else {
    psTree(pid, function(err, children) {
      if (err) {
        log('kill psTree err', err)
        return
      }

      [pid].concat(
        children.map(function(p) {
          return p.PID
        })
      ).forEach(function(tpid) {
        try {
          process.kill(tpid, signal)
        } catch (ex) {
          log('process.kill err', tpid, signal, ex)
        }
      })
    })
  }
}

function startServer(options, cb) {
  if (starting) {
    return server
  }
  starting = true

  var command, commandDir, args

  // If we're trying to debug, check to make sure we have the go proxy source installed on our system first
  var runDebugProxy = false
  if (debug) {
    try {
      fs.lstatSync(process.env.GOPATH + '/src/github.com/stoplightio/go-prism')
      runDebugProxy = true
    } catch (e) {
      log('cant start in debug mode', e)
    }
  }

  if (runDebugProxy) {
    //run -c config.json -s spec/orig/swagger.json -p 4011 -m -d
    // args = ['-a=run ' + ['-c ' + Path.join(options.config, 'config.json'), '-s ' + Path.join(options.config, 'spec.json')].join(' ')]
    args = ['run', 'main.go', 'run', `-p=${process.env.PRISM_PORT}`]
    command = 'go'
    commandDir = process.env.GOPATH + '/src/github.com/stoplightio/go-prism'
  } else {
    if (process.platform === 'win32') {
      command = 'prism.exe'
    } else {
      command = './prism'
    }

    commandDir = Path.join(__dirname, 'proxy')
    // args = ['run', '-c=./config.json', '-s=./spec.json']
    args = ['run', `-p=${process.env.PRISM_PORT}`]
  }

  log('starting proxy with command', commandDir, command, args, process.env.SL_API_HOST)
  server = spawn(command, args, {
    cwd: commandDir,
  });

  server.stdout.on('data', function(data) {
    starting = false
    log(String(data))
  })
  server.stderr.on('data', function(data) {
    starting = false
    var toLog = String(data)
    log(toLog)

    if (toLog.match(/already in use|bind/)) {
      if (onClose) {
        onClose(2)
      }
    }
  })
  server.on('close', function(code) {
    if (onClose) {
      onClose(code)
    }

    log('killed with code', code)
    resetProxy()
  })

  if (cb) {
    cb()
  }
  return server
}

process.on('SIGTERM', function () {
  if (server) {
    kill(server.pid, 'SIGTERM')
  }
})

process.on('SIGINT', function () {
  if (server) {
    kill(server.pid, 'SIGINT')
  }
})

process.on('exit', function () {
  if (server) {
    kill(server.pid, 'exit')
  }
})

var serverFunctions = {}

serverFunctions.start = function(options, cb, onCloseCb) {
  onClose = onCloseCb

  if (!server || server.exitCode) {
    log('initializing start')
    return startServer(options, cb)
  }

  if (!starting && server.pid) {
    log('initializing restart', server)
    serverFunctions.stop(function() {
      startServer(options, cb)
    })
  }
}

serverFunctions.stop = function(cb) {
  if (server) {
    log('initializing stop')
    kill(server.pid, null, cb)
  } else {
    log('tried to stop, but it\'s not running!')
    if (cb) {
      cb()
    }
  }
}

serverFunctions.setLogger = function(newLogger) {
  logger = newLogger
}

module.exports = serverFunctions

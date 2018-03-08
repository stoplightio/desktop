const { session, ipcMain } = require('electron');

const config = require('../config');

let log;
let currentSession;

exports.init = ({ logger }, cb) => {
  log = logger;

  exports.getCurrentSession(cookie => {
    if (cookie) {
      currentSession = `${cookie.name}=${cookie.value}`;
    }

    cb(cookie);
  });
};

exports.getCurrentSession = cb => {
  if (session.defaultSession) {
    session.defaultSession.cookies.get(
      { url: config.get('networking.platformHost') },
      (error, cookies) => {
        let found = null;
        if (error) {
          log('session.get.error', error);
          return;
        } else {
          for (const cookie of cookies) {
            if (cookie.name === '_stoplight_session') {
              found = cookie;
              break;
            }
          }
        }

        cb(found);
      }
    );
  } else {
    cb();
  }
};

ipcMain.on('session.create', (_event, options) => {
  if (session.defaultSession) {
    log('session.create');
    session.defaultSession.cookies.set(
      {
        url: config.get('networking.platformHost'),
        name: '_stoplight_session',
        value: options.value,
        httpOnly: true,
        expirationDate: new Date().getTime() + 1000 * 60 * 60 * 24 * 365,
      },
      error => {
        if (error) {
          log('session.create.error', error);
        } else {
          currentSession = `_stoplight_session=${options.value}`;

          if (session.defaultSession) {
            session.defaultSession.cookies.flushStore(() => {
              log('session.flushed');
            });
          }
        }
      }
    );
  }
});

ipcMain.on('session.remove', () => {
  if (session.defaultSession) {
    log('session.remove');
    session.defaultSession.cookies.remove('http://localhost', '_stoplight_session', error => {
      if (error) {
        log('session.remove.error', error);
      } else {
        currentSession = undefined;
      }
    });
  }
});

ipcMain.on('session.get', event => {
  event.returnValue = currentSession || null;
});

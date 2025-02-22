import 'module-alias/register';
import app from '~/app';
import http from 'http';
import debug from "debug";

import dotenv from 'dotenv';
import {$logged, initLogs} from "#helpers/logHelpers";
import {ASCII_logo} from "#assets/constants/general";
dotenv.config();
console.clear();
initLogs()
console.log(ASCII_logo)
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
function normalizePort(val: any) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      let log_EACCES = bind + ' requires elevated privileges'
      $logged(log_EACCES, false, {from: 'node.js'}, null, true);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      let log_EADDRINUSE = bind + ' is already in use';
      $logged(log_EADDRINUSE, false, {from: 'node.js'}, null, true);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr: any = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  let log = `Express app running on ${addr.address}${addr.port}`
  $logged(log, true, {from: 'node.js'}, null, true);
}

const server = http.createServer(app);

server.on('error', onError);
server.on('listening', onListening);
server.listen(port);
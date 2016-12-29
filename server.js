const winston      = require('winston');
const Busboy       = require('busboy');
const http         = require('http');
const uuid         = require('uuid/v4');

class Server {

  constructor(options={Disassembler, codeFormatter: (code) => (code), port: 3000, env: 'dev', logLevel: 'info'}) {
    this.Disassembler = options.Disassembler;
    this.codeFormatter = options.codeFormatter;
    this.port = options.port;
    this.env = options.env;
    this.logLevel = options.logLevel;
    this.logger = this._createLogger(winston);
  }

  _createLogger(winston) {
    const logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({
          dirname: 'logs',
          filename: `${this.env}.log`,
          maxsize: 10000,
          maxFiles: 10
        })
      ]
    });
    logger.level = this.logLevel;
    return logger;
  }

  run() {
    const handlePost = (req, res) => {
      const guid = uuid();
      logger.info(`${guid}: Disassembling started at ${new Date()}`);
      const disassembler = new this.Disassembler({logger, guid});
      const busboy = new Busboy({ headers: req.headers });
      let code = "";

      const writeOutput = (bytecode) => {
        logger.info(`${guid}: Disassembling finished at ${new Date()}\n`);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(bytecode));
      };

      busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
        if (fieldname == 'code') {
          // escape the quote so it doesn't collide with the shell terminator
          code = this.codeFormatter(val);
          logger.debug(`${guid}: Code  -> ${code}`);
        }
      });

      busboy.on('finish', () => {
        disassembler.run(code, writeOutput);
      });

      req.pipe(busboy);
    };

    const router = (req, res) => {
      if (req.method == 'POST') {
        handlePost(req, res);
      } else {
        logger.debug(`Bounced non-post request: ${req.method} at ${new Date()}`);
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Please submit a post with a json payload.');
      }
    };

    http.createServer(router).listen(this.port, '0.0.0.0', () => {
      logger.info(`Server started at ${new Date()}, listening on http://0.0.0.0:${this.port}/`);
    });
  }
}

module.exports = Server;

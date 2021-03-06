const is = require('is');

module.exports = [
  {
    point: 'preRequest',
    async handler(route, request) {
      request.auditLog = { start: process.hrtime() };
      return [route, request];
    },
  },
  {
    point: 'preResponse',
    async handler(error, result, request) {
      const service = this;
      const execTime = request.auditLog.execTime = process.hrtime(request.auditLog.start);

      const meta = {
        route: request.route,
        params: request.params,
        method: request.method,
        transport: request.transport,
        headers: request.headers,
        query: request.query,
        latency: (execTime[0] * 1000) + (+(execTime[1] / 1000000).toFixed(3)),
      };

      if (error) {
        const err = is.fn(error.toJSON) ? error.toJSON() : error.toString();
        const { statusCode } = error;

        // determine error level
        let level = 'error';
        if (statusCode && (statusCode < 400 || statusCode === 404)) {
          level = 'warn';
        } else if (error.name === 'ValidationError') {
          level = 'warn';
        }

        meta.err = error;
        request.log[level](meta, 'Error performing operation -', err);
      } else {
        if (service.config.debug) {
          meta.response = result;
        }

        request.log.info(meta, 'completed operation');
      }

      return [error, result];
    },
  },
];

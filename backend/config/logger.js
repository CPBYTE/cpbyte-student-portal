import { AsyncLocalStorage } from "async_hooks";

export const contextStorage = new AsyncLocalStorage();

const getFormattedTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

class StructuredLogger {
    /**
     * Get trace ID for the current context (resolves dynamically from AsyncLocalStorage)
     * @returns {string}
     */
    getTraceId() {
        return contextStorage.getStore()?.traceId || 'system';
    }

    /**
     * Log with structured flat format
     * @param {string} level
     * @param {string} message
     * @param {object} metadata
     */
    log(level, message, metadata = {}) {
        const store = contextStorage.getStore();
        const traceId = metadata.traceId || store?.traceId || 'system';
        const requestId = metadata.requestId || store?.requestId;
        
        const logObj = {
            level,
            message,
            traceId,
            ...(requestId ? { requestId } : {}),
            timestamp: getFormattedTimestamp(),
            ...metadata
        };

        if (level === 'error') {
            console.error(JSON.stringify(logObj));
        } else if (level === 'warn') {
            console.warn(JSON.stringify(logObj));
        } else {
            console.log(JSON.stringify(logObj));
        }
    }

    /**
     * Log info level
     * @param {string} message
     * @param {object} metadata
     */
    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }

    /**
     * Log error level
     * @param {string} message
     * @param {object} metadata
     */
    error(message, metadata = {}) {
        this.log('error', message, metadata);
    }

    /**
     * Log warn level
     * @param {string} message
     * @param {object} metadata
     */
    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }

    /**
     * Log debug level
     * @param {string} message
     * @param {object} metadata
     */
    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }

    /**
     * Log request start
     * @param {string} traceId
     * @param {string} method
     * @param {string} path
     * @param {object} metadata
     */
    logRequestStart(traceId, method, path, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('REQUEST_START', {
            traceId: activeTrace,
            method,
            path,
            ...metadata
        });
    }

    /**
     * Log request end
     * @param {string} traceId
     * @param {number} statusCode
     * @param {number} duration
     * @param {object} metadata
     */
    logRequestEnd(traceId, statusCode, duration, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('REQUEST_END', {
            traceId: activeTrace,
            statusCode,
            durationMs: duration,
            ...metadata
        });
    }

    /**
     * Log event emission
     * @param {string} traceId
     * @param {string} eventName
     * @param {string} eventId
     * @param {object} metadata
     */
    logEventEmitted(traceId, eventName, eventId, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('EVENT_EMITTED', {
            traceId: activeTrace,
            eventName,
            eventId,
            ...metadata
        });
    }

    /**
     * Log event received
     * @param {string} traceId
     * @param {string} eventName
     * @param {string} eventId
     * @param {object} metadata
     */
    logEventReceived(traceId, eventName, eventId, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('EVENT_RECEIVED', {
            traceId: activeTrace,
            eventName,
            eventId,
            ...metadata
        });
    }

    /**
     * Log listener execution
     * @param {string} traceId
     * @param {string} eventName
     * @param {string} listenerName
     * @param {number} duration
     * @param {object} metadata
     */
    logListenerExecution(traceId, eventName, listenerName, duration, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('LISTENER_EXECUTED', {
            traceId: activeTrace,
            eventName,
            listenerName,
            durationMs: duration,
            ...metadata
        });
    }

    /**
     * Log job queued
     * @param {string} traceId
     * @param {string} jobId
     * @param {string} jobName
     * @param {object} metadata
     */
    logJobQueued(traceId, jobId, jobName, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('JOB_QUEUED', {
            traceId: activeTrace,
            jobId,
            jobName,
            ...metadata
        });
    }

    /**
     * Log job started
     * @param {string} traceId
     * @param {string} jobId
     * @param {string} jobName
     * @param {object} metadata
     */
    logJobStarted(traceId, jobId, jobName, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('JOB_STARTED', {
            traceId: activeTrace,
            jobId,
            jobName,
            ...metadata
        });
    }

    /**
     * Log job completed
     * @param {string} traceId
     * @param {string} jobId
     * @param {string} jobName
     * @param {number} duration
     * @param {object} metadata
     */
    logJobCompleted(traceId, jobId, jobName, duration, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('JOB_COMPLETED', {
            traceId: activeTrace,
            jobId,
            jobName,
            durationMs: duration,
            ...metadata
        });
    }

    /**
     * Log job failed
     * @param {string} traceId
     * @param {string} jobId
     * @param {string} jobName
     * @param {string} error
     * @param {object} metadata
     */
    logJobFailed(traceId, jobId, jobName, error, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.error('JOB_FAILED', {
            traceId: activeTrace,
            jobId,
            jobName,
            error,
            ...metadata
        });
    }

    /**
     * Log error with trace
     * @param {string} traceId
     * @param {string} message
     * @param {Error} error
     * @param {object} metadata
     */
    logError(traceId, message, error, metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.error(message, {
            traceId: activeTrace,
            error: error.message,
            stack: error.stack,
            ...metadata
        });
    }

    /**
     * Log performance metric
     * @param {string} traceId
     * @param {string} metricName
     * @param {number} value
     * @param {string} unit
     * @param {object} metadata
     */
    logMetric(traceId, metricName, value, unit = 'ms', metadata = {}) {
        const activeTrace = traceId || this.getTraceId();
        this.info('METRIC', {
            traceId: activeTrace,
            metricName,
            value,
            unit,
            ...metadata
        });
    }

    /**
     * Log event flow chain
     * @param {string} traceId
     * @param {Array} chain
     */
    logEventFlowChain(traceId, chain) {
        const activeTrace = traceId || this.getTraceId();
        this.info('EVENT_FLOW_CHAIN', {
            traceId: activeTrace,
            chain: chain.map(step => ({
                step: step.step,
                service: step.service,
                duration: step.duration,
                timestamp: step.timestamp
            })),
            totalDuration: chain.reduce((sum, step) => sum + (step.duration || 0), 0)
        });
    }
}

const structuredLogger = new StructuredLogger();
export default structuredLogger;

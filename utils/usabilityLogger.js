/**
 * Usability Logging Utility
 * For Research Purposes - Measures Task Completion Rate
 *
 * This utility logs user actions to support usability evaluation.
 * Can be extended to log to Supabase for persistent data collection.
 */

// Task completion log storage (in-memory)
const taskLogs = [];

/**
 * Logs a task completion event
 * @param {string} taskName - Name of the task completed
 * @param {number} timeTaken - Time taken to complete the task in milliseconds
 * @param {boolean} success - Whether the task was completed successfully
 * @param {object} metadata - Additional metadata about the task
 */
export const logTaskCompletion = (
  taskName,
  timeTaken,
  success,
  metadata = {}
) => {
  const logEntry = {
    taskName,
    timeTaken,
    timeTakenFormatted: formatTime(timeTaken),
    success,
    timestamp: new Date().toISOString(),
    metadata,
  };

  taskLogs.push(logEntry);

  // Console logging for development
  console.log("=== USABILITY LOG ===");
  console.log(`Task: ${taskName}`);
  console.log(`Time Taken: ${logEntry.timeTakenFormatted}`);
  console.log(`Success: ${success ? "✓ Yes" : "✗ No"}`);
  console.log(`Timestamp: ${logEntry.timestamp}`);
  if (Object.keys(metadata).length > 0) {
    console.log("Metadata:", metadata);
  }
  console.log("====================");

  // TODO: Add Supabase logging when needed
  // logToSupabase(logEntry);

  return logEntry;
};

/**
 * Logs the start of a task (for timing purposes)
 * @param {string} taskName - Name of the task being started
 * @returns {object} Task timer object with stop() method
 */
export const startTaskTimer = (taskName) => {
  const startTime = Date.now();

  console.log(`[TIMER] Task started: ${taskName}`);

  return {
    taskName,
    startTime,
    stop: (success = true, metadata = {}) => {
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      return logTaskCompletion(taskName, timeTaken, success, metadata);
    },
  };
};

/**
 * Logs a screen view event
 * @param {string} screenName - Name of the screen viewed
 */
export const logScreenView = (screenName) => {
  const logEntry = {
    event: "screen_view",
    screenName,
    timestamp: new Date().toISOString(),
  };

  console.log(`[SCREEN VIEW] ${screenName}`);
  taskLogs.push(logEntry);

  return logEntry;
};

/**
 * Logs a user interaction event
 * @param {string} action - The action performed
 * @param {string} element - The UI element interacted with
 * @param {object} details - Additional details
 */
export const logInteraction = (action, element, details = {}) => {
  const logEntry = {
    event: "interaction",
    action,
    element,
    details,
    timestamp: new Date().toISOString(),
  };

  console.log(`[INTERACTION] ${action} on ${element}`);
  taskLogs.push(logEntry);

  return logEntry;
};

/**
 * Logs an error event
 * @param {string} errorType - Type of error
 * @param {string} message - Error message
 * @param {object} context - Context where error occurred
 */
export const logError = (errorType, message, context = {}) => {
  const logEntry = {
    event: "error",
    errorType,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error(`[ERROR] ${errorType}: ${message}`);
  taskLogs.push(logEntry);

  return logEntry;
};

/**
 * Gets all logged tasks
 * @returns {array} Array of all task logs
 */
export const getAllLogs = () => {
  return [...taskLogs];
};

/**
 * Calculates task completion rate
 * @returns {object} Statistics about task completion
 */
export const getTaskStatistics = () => {
  const completionLogs = taskLogs.filter((log) => log.taskName);
  const successfulTasks = completionLogs.filter((log) => log.success);

  const totalTasks = completionLogs.length;
  const successRate =
    totalTasks > 0
      ? ((successfulTasks.length / totalTasks) * 100).toFixed(2)
      : 0;

  const avgTime =
    completionLogs.length > 0
      ? completionLogs.reduce((sum, log) => sum + (log.timeTaken || 0), 0) /
        completionLogs.length
      : 0;

  return {
    totalTasks,
    successfulTasks: successfulTasks.length,
    failedTasks: totalTasks - successfulTasks.length,
    successRate: `${successRate}%`,
    averageTimeMs: avgTime,
    averageTimeFormatted: formatTime(avgTime),
  };
};

/**
 * Clears all logs (for testing purposes)
 */
export const clearLogs = () => {
  taskLogs.length = 0;
  console.log("[LOGGER] All logs cleared");
};

/**
 * Formats milliseconds to human-readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
const formatTime = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

/**
 * Future: Log to Supabase
 * Uncomment and configure when needed
 */
// const logToSupabase = async (logEntry) => {
//   try {
//     const { supabase } = await import('../config/supabase');
//
//     const { error } = await supabase
//       .from('usability_logs')
//       .insert(logEntry);
//
//     if (error) throw error;
//     console.log('[SUPABASE] Log saved successfully');
//   } catch (error) {
//     console.error('[SUPABASE] Failed to save log:', error);
//   }
// };

export default {
  logTaskCompletion,
  startTaskTimer,
  logScreenView,
  logInteraction,
  logError,
  getAllLogs,
  getTaskStatistics,
  clearLogs,
};

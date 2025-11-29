/**
 * Market Data Ingestion Job Scheduler
 * Handles periodic fetching of market data from Discogs/eBay
 *
 * This module provides infrastructure for scheduling market data updates.
 * Actual API integration with Discogs/eBay would be implemented in a separate module
 * and called from this scheduler.
 */

import { getReleasesNeedingMarketData, batchUpdateMarketSnapshots, type MarketDataRecord } from '../services/market-data-ingestion.js';

export interface SchedulerConfig {
  intervalMinutes: number;
  batchSize: number;
  maxAgeHours: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface JobResult {
  jobId: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  releasesProcessed: number;
  recordsIngested: number;
  errors: Array<{
    message: string;
    timestamp: Date;
  }>;
  success: boolean;
}

let jobId = 0;
let isRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
const jobHistory: JobResult[] = [];

/**
 * Simulate fetching market data from Discogs/eBay
 * In production, this would call actual API endpoints
 */
async function fetchMarketData(releaseId: string): Promise<MarketDataRecord[]> {
  // This is a placeholder implementation
  // In production, this would:
  // 1. Call Discogs API to get market data
  // 2. Call eBay API to get market data
  // 3. Transform responses to MarketDataRecord format
  // 4. Handle API errors and rate limiting

  // Example return format (dummy data):
  return [
    {
      releaseId,
      source: 'discogs' as const,
      statLow: Math.random() * 10 + 5,
      statMedian: Math.random() * 20 + 15,
      statHigh: Math.random() * 30 + 25,
    },
    {
      releaseId,
      source: 'ebay' as const,
      statLow: Math.random() * 10 + 5,
      statMedian: Math.random() * 20 + 15,
      statHigh: Math.random() * 30 + 25,
    },
  ];
}

/**
 * Execute a single market data ingestion job
 */
async function runIngestionJob(config: SchedulerConfig): Promise<JobResult> {
  const currentJobId = ++jobId;
  const startTime = new Date();
  const errors: Array<{ message: string; timestamp: Date }> = [];

  try {
    // Get releases that need data
    const releases = await getReleasesNeedingMarketData(config.maxAgeHours, config.batchSize);

    if (releases.length === 0) {
      console.log('[Market Data Job] No releases need updating');
      return {
        jobId: `job-${currentJobId}`,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        releasesProcessed: 0,
        recordsIngested: 0,
        errors,
        success: true,
      };
    }

    console.log(`[Market Data Job] Processing ${releases.length} releases`);

    // Fetch market data for each release (with retry logic)
    const allRecords: MarketDataRecord[] = [];

    for (const release of releases) {
      let attempts = 0;
      let success = false;

      while (attempts < config.retryAttempts && !success) {
        try {
          const records = await fetchMarketData(release.id);
          allRecords.push(...records);
          success = true;
        } catch (error) {
          attempts++;
          if (attempts < config.retryAttempts) {
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs));
          } else {
            errors.push({
              message: `Failed to fetch market data for release ${release.id} after ${config.retryAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    // Batch update market snapshots
    const ingestResult = await batchUpdateMarketSnapshots(allRecords);

    // Log ingestion errors
    for (const error of ingestResult.errors) {
      errors.push({
        message: `Ingestion error for release ${error.releaseId} (${error.source}): ${error.error}`,
        timestamp: new Date(),
      });
    }

    const endTime = new Date();
    return {
      jobId: `job-${currentJobId}`,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      releasesProcessed: releases.length,
      recordsIngested: ingestResult.successCount,
      errors,
      success: ingestResult.errorCount === 0,
    };
  } catch (error) {
    const endTime = new Date();
    errors.push({
      message: `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    });

    return {
      jobId: `job-${currentJobId}`,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      releasesProcessed: 0,
      recordsIngested: 0,
      errors,
      success: false,
    };
  }
}

/**
 * Start the market data scheduler
 */
export function startScheduler(config: SchedulerConfig): void {
  if (isRunning) {
    console.log('[Market Data Scheduler] Scheduler already running');
    return;
  }

  isRunning = true;
  console.log(`[Market Data Scheduler] Started with interval ${config.intervalMinutes} minutes`);

  // Run immediately on start
  runIngestionJob(config)
    .then((result) => {
      jobHistory.push(result);
      console.log(
        `[Market Data Scheduler] Job ${result.jobId} completed: ${result.recordsIngested} records ingested`
      );
    })
    .catch((error) => {
      console.error('[Market Data Scheduler] Job failed:', error);
    });

  // Set up interval for subsequent runs
  schedulerInterval = setInterval(() => {
    runIngestionJob(config)
      .then((result) => {
        jobHistory.push(result);
        console.log(
          `[Market Data Scheduler] Job ${result.jobId} completed: ${result.recordsIngested} records ingested`
        );
      })
      .catch((error) => {
        console.error('[Market Data Scheduler] Job failed:', error);
      });
  }, config.intervalMinutes * 60 * 1000);
}

/**
 * Stop the market data scheduler
 */
export function stopScheduler(): void {
  if (!isRunning) {
    console.log('[Market Data Scheduler] Scheduler not running');
    return;
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  isRunning = false;
  console.log('[Market Data Scheduler] Stopped');
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return isRunning;
}

/**
 * Get job history
 */
export function getJobHistory(limit: number = 50): JobResult[] {
  return jobHistory.slice(-limit);
}

/**
 * Clear job history
 */
export function clearJobHistory(): void {
  jobHistory.length = 0;
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): {
  isRunning: boolean;
  totalJobsRun: number;
  successfulJobs: number;
  failedJobs: number;
  lastJobResult: JobResult | null;
  averageJobDurationMs: number;
  totalRecordsIngested: number;
} {
  const successfulJobs = jobHistory.filter((j) => j.success).length;
  const failedJobs = jobHistory.filter((j) => !j.success).length;
  const lastJobResult = jobHistory.length > 0 ? jobHistory[jobHistory.length - 1] : null;

  const avgDuration =
    jobHistory.length > 0 ? jobHistory.reduce((sum, j) => sum + j.durationMs, 0) / jobHistory.length : 0;

  const totalRecords = jobHistory.reduce((sum, j) => sum + j.recordsIngested, 0);

  return {
    isRunning,
    totalJobsRun: jobHistory.length,
    successfulJobs,
    failedJobs,
    lastJobResult,
    averageJobDurationMs: avgDuration,
    totalRecordsIngested: totalRecords,
  };
}

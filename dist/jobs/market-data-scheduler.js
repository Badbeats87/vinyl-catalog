/**
 * Market Data Ingestion Job Scheduler
 * Handles periodic fetching of market data from Discogs/eBay
 *
 * This module provides infrastructure for scheduling market data updates.
 * Actual API integration with Discogs/eBay would be implemented in a separate module
 * and called from this scheduler.
 */
import { getReleasesNeedingMarketData, batchUpdateMarketSnapshots } from '../services/market-data-ingestion';
let jobId = 0;
let isRunning = false;
let schedulerInterval = null;
const jobHistory = [];
/**
 * Simulate fetching market data from Discogs/eBay
 * In production, this would call actual API endpoints
 */
async function fetchMarketData(releaseId) {
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
            source: 'discogs',
            statLow: Math.random() * 10 + 5,
            statMedian: Math.random() * 20 + 15,
            statHigh: Math.random() * 30 + 25,
        },
        {
            releaseId,
            source: 'ebay',
            statLow: Math.random() * 10 + 5,
            statMedian: Math.random() * 20 + 15,
            statHigh: Math.random() * 30 + 25,
        },
    ];
}
/**
 * Execute a single market data ingestion job
 */
async function runIngestionJob(config) {
    const currentJobId = ++jobId;
    const startTime = new Date();
    const errors = [];
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
        const allRecords = [];
        for (const release of releases) {
            let attempts = 0;
            let success = false;
            while (attempts < config.retryAttempts && !success) {
                try {
                    const records = await fetchMarketData(release.id);
                    allRecords.push(...records);
                    success = true;
                }
                catch (error) {
                    attempts++;
                    if (attempts < config.retryAttempts) {
                        // Wait before retrying
                        await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs));
                    }
                    else {
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
    }
    catch (error) {
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
export function startScheduler(config) {
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
        console.log(`[Market Data Scheduler] Job ${result.jobId} completed: ${result.recordsIngested} records ingested`);
    })
        .catch((error) => {
        console.error('[Market Data Scheduler] Job failed:', error);
    });
    // Set up interval for subsequent runs
    schedulerInterval = setInterval(() => {
        runIngestionJob(config)
            .then((result) => {
            jobHistory.push(result);
            console.log(`[Market Data Scheduler] Job ${result.jobId} completed: ${result.recordsIngested} records ingested`);
        })
            .catch((error) => {
            console.error('[Market Data Scheduler] Job failed:', error);
        });
    }, config.intervalMinutes * 60 * 1000);
}
/**
 * Stop the market data scheduler
 */
export function stopScheduler() {
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
export function isSchedulerRunning() {
    return isRunning;
}
/**
 * Get job history
 */
export function getJobHistory(limit = 50) {
    return jobHistory.slice(-limit);
}
/**
 * Clear job history
 */
export function clearJobHistory() {
    jobHistory.length = 0;
}
/**
 * Get scheduler statistics
 */
export function getSchedulerStats() {
    const successfulJobs = jobHistory.filter((j) => j.success).length;
    const failedJobs = jobHistory.filter((j) => !j.success).length;
    const lastJobResult = jobHistory.length > 0 ? jobHistory[jobHistory.length - 1] : null;
    const avgDuration = jobHistory.length > 0 ? jobHistory.reduce((sum, j) => sum + j.durationMs, 0) / jobHistory.length : 0;
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
//# sourceMappingURL=market-data-scheduler.js.map
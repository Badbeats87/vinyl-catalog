/**
 * Market Data Ingestion Job Scheduler
 * Handles periodic fetching of market data from Discogs/eBay
 *
 * This module provides infrastructure for scheduling market data updates.
 * Actual API integration with Discogs/eBay would be implemented in a separate module
 * and called from this scheduler.
 */
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
/**
 * Start the market data scheduler
 */
export declare function startScheduler(config: SchedulerConfig): void;
/**
 * Stop the market data scheduler
 */
export declare function stopScheduler(): void;
/**
 * Check if scheduler is running
 */
export declare function isSchedulerRunning(): boolean;
/**
 * Get job history
 */
export declare function getJobHistory(limit?: number): JobResult[];
/**
 * Clear job history
 */
export declare function clearJobHistory(): void;
/**
 * Get scheduler statistics
 */
export declare function getSchedulerStats(): {
    isRunning: boolean;
    totalJobsRun: number;
    successfulJobs: number;
    failedJobs: number;
    lastJobResult: JobResult | null;
    averageJobDurationMs: number;
    totalRecordsIngested: number;
};
//# sourceMappingURL=market-data-scheduler.d.ts.map
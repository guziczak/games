/**
 * @module Timer
 * @description Timer functionality for quiz questions
 */

export class Timer {
    constructor() {
        this.interval = null;
        this.startTime = null;
        this.duration = 30;
        this.onTimeout = null;
        this.onTick = null;
    }

    /**
     * Starts the timer
     * @param {number} duration - Duration in seconds
     * @param {Function} onTimeout - Callback when time expires
     * @param {Function} onTick - Callback for each tick
     */
    start(duration, onTimeout, onTick) {
        this.stop();
        this.duration = duration;
        this.onTimeout = onTimeout;
        this.onTick = onTick;
        this.startTime = Date.now();
        
        this.interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const remaining = Math.max(0, this.duration - elapsed);
            
            if (this.onTick) {
                this.onTick(remaining, this.duration);
            }
            
            if (remaining === 0) {
                this.stop();
                if (this.onTimeout) this.onTimeout();
            }
        }, 100);
    }

    /**
     * Stops the timer
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Gets elapsed time
     * @returns {number} Elapsed time in seconds
     */
    getElapsed() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Checks if timer is running
     * @returns {boolean} Running status
     */
    isRunning() {
        return this.interval !== null;
    }

    /**
     * Pauses the timer
     * @returns {number} Remaining time when paused
     */
    pause() {
        if (!this.isRunning()) return 0;
        
        const elapsed = this.getElapsed();
        const remaining = Math.max(0, this.duration - elapsed);
        this.stop();
        return remaining;
    }

    /**
     * Resumes the timer
     * @param {number} remainingTime - Time to resume from
     */
    resume(remainingTime) {
        if (this.isRunning()) return;
        this.start(remainingTime, this.onTimeout, this.onTick);
    }
}
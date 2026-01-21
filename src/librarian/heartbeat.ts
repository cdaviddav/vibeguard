import { OracleService } from './oracle.js';

export class Heartbeat {
  private oracle: OracleService;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private quietReflectionInterval: number = 10 * 60 * 1000; // 10 minutes
  private isEnabled: boolean = false;

  constructor(oracle: OracleService) {
    this.oracle = oracle;
  }

  /**
   * Record activity (called when commits or other activity happens)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
    
    // Reset the inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // If enabled, restart the timer
    if (this.isEnabled) {
      this.scheduleQuietReflection();
    }
  }

  /**
   * Schedule quiet reflection after inactivity period
   */
  private scheduleQuietReflection(): void {
    // Clear any existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Schedule quiet reflection after 10 minutes of inactivity
    this.inactivityTimer = setTimeout(() => {
      this.performQuietReflection().catch(error => {
        console.error('[Heartbeat] Error during quiet reflection:', error);
      });
    }, this.quietReflectionInterval);
  }

  /**
   * Perform quiet reflection - trigger oracle to seek prophecy
   */
  private async performQuietReflection(): Promise<void> {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;

    // Only perform if we've been inactive for at least the quiet reflection interval
    if (timeSinceActivity >= this.quietReflectionInterval) {
      console.log('[Heartbeat] Performing Quiet Reflection (10 minutes of inactivity)...');
      
      try {
        await this.oracle.seekProphecy();
        console.log('[Heartbeat] Quiet Reflection complete');
      } catch (error) {
        console.error('[Heartbeat] Error during quiet reflection:', error);
      }
    }

    // Schedule next quiet reflection if still enabled
    if (this.isEnabled) {
      this.scheduleQuietReflection();
    }
  }

  /**
   * Start the heartbeat (enables quiet reflection)
   */
  start(): void {
    if (this.isEnabled) {
      return; // Already started
    }

    this.isEnabled = true;
    this.lastActivityTime = Date.now();
    this.scheduleQuietReflection();
    console.log('[Heartbeat] Started - Quiet Reflection enabled (10 min inactivity)');
  }

  /**
   * Stop the heartbeat
   */
  stop(): void {
    this.isEnabled = false;
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    console.log('[Heartbeat] Stopped');
  }

  /**
   * Get time since last activity (in milliseconds)
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Check if quiet reflection is due
   */
  isQuietReflectionDue(): boolean {
    return this.getTimeSinceLastActivity() >= this.quietReflectionInterval;
  }
}


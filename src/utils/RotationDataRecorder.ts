import { DeviceMotion } from 'expo-sensors';
import { EventSubscription } from 'expo-modules-core';

export interface RotationData {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

export class RotationDataRecorder {
  private subscription: EventSubscription | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRecording = false;
  private rotationData: RotationData[] = [];
  private latestRotation: RotationData | null = null;
  private recordingInterval: number;
  private recordingStartTime: number = 0;

  constructor(intervalMs: number = 1000) {
    this.recordingInterval = intervalMs;
  }

  async startRecording(): Promise<void> {
    // Always cleanup first to ensure clean state
    this.cleanup();
    
    try {
      // Check if DeviceMotion is available
      const isAvailable = await DeviceMotion.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('DeviceMotion is not available on this device');
      }

      // Request permissions
      const permission = await DeviceMotion.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('DeviceMotion permission not granted');
      }

      // Clear any existing data and reset state
      this.rotationData = [];
      this.latestRotation = null;
      this.recordingStartTime = Date.now();
      
      console.log('🎬 Starting rotation data recording...');

      // Subscribe to DeviceMotion updates FIRST
      this.subscription = DeviceMotion.addListener((data) => {
        // Use a local check to avoid race conditions
        if (data.rotation && this.isRecording) {
          this.latestRotation = {
            alpha: data.rotation.alpha,
            beta: data.rotation.beta,
            gamma: data.rotation.gamma,
            timestamp: data.rotation.timestamp,
          };
        }
      });

      // Set isRecording to true BEFORE setting up the interval
      this.isRecording = true;

      // Set up interval to record rotation data
      this.intervalId = setInterval(() => {
        // Double-check the recording state
        if (this.latestRotation && this.isRecording) {
          const dataPoint: RotationData = {
            ...this.latestRotation,
            timestamp: Date.now(),
          };
          
          this.rotationData.push(dataPoint);
          console.log('📊 Rotation data recorded (total: ' + this.rotationData.length + '):', dataPoint);
        }
      }, this.recordingInterval);

      console.log('✅ RotationDataRecorder started successfully, isRecording:', this.isRecording);
      console.log('📊 Recording start time:', this.recordingStartTime);
    } catch (error) {
      console.error('Failed to start rotation data recording:', error);
      this.cleanup();
      throw error;
    }
  }

  stopRecording(): RotationData[] {
    const stopTime = Date.now();
    console.log('🛑 stopRecording called at:', stopTime);
    console.log('🛑 Recording duration:', stopTime - this.recordingStartTime, 'ms');
    console.log('🛑 Current isRecording state:', this.isRecording);
    console.log('🛑 Current data points before stop:', this.rotationData.length);
    console.log('🛑 Interval ID exists:', !!this.intervalId);
    console.log('🛑 Subscription exists:', !!this.subscription);
    
    // Don't change isRecording yet - let the cleanup handle it
    const wasRecording = this.isRecording;
    
    // IMMEDIATELY set isRecording to false to prevent any new data
    this.isRecording = false;
    
    // Add any final data point if we have one and were recording
    if (this.latestRotation && wasRecording) {
      const finalDataPoint: RotationData = {
        ...this.latestRotation,
        timestamp: stopTime,
      };
      this.rotationData.push(finalDataPoint);
      console.log('📊 Added final rotation data point:', finalDataPoint);
    }
    
    // Make a copy of the data BEFORE cleanup
    const recordedData = [...this.rotationData];
    
    // Clean up intervals and subscriptions
    this.cleanup();
    
    console.log('✅ Rotation recording stopped. Total data points:', recordedData.length);
    console.log('📊 Recording was active for:', stopTime - this.recordingStartTime, 'ms');
    
    if (recordedData.length > 0) {
      console.log('📊 First data point:', recordedData[0]);
      console.log('📊 Last data point:', recordedData[recordedData.length - 1]);
    }
    
    return recordedData;
  }

  private cleanup(): void {
    // Clear interval first to stop new data recording
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Rotation data recording interval cleared');
    }

    // Then remove the subscription
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('🔄 DeviceMotion subscription removed');
    }
  }

  getRecordedData(): RotationData[] {
    return [...this.rotationData];
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  // Clean up resources when the recorder is no longer needed
  destroy(): void {
    this.isRecording = false;
    this.cleanup();
    this.rotationData = [];
    this.latestRotation = null;
  }
}

import { DeviceMotion } from 'expo-sensors';
import { EventSubscription } from 'expo-modules-core';

export interface PhotoData {
  index: number;
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
  photoUri?: string;
}

export class PhotoDataRecorder {
  private subscription: EventSubscription | null = null;
  private isRecording = false;
  private photoData: PhotoData[] = [];
  private latestRotation: { alpha: number; beta: number; gamma: number; timestamp: number } | null = null;
  private currentIndex = 0;
  private recordingStartTime: number = 0;

  constructor() {}

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
      this.photoData = [];
      this.latestRotation = null;
      this.currentIndex = 0;
      this.recordingStartTime = Date.now();
      
      console.log('📷 Starting photo data recording...');

      // Subscribe to DeviceMotion updates
      this.subscription = DeviceMotion.addListener((data) => {
        if (data.rotation && this.isRecording) {
          this.latestRotation = {
            alpha: data.rotation.alpha,
            beta: data.rotation.beta,
            gamma: data.rotation.gamma,
            timestamp: data.rotation.timestamp,
          };
        }
      });

      // Set isRecording to true
      this.isRecording = true;

      console.log('✅ PhotoDataRecorder started successfully, isRecording:', this.isRecording);
      console.log('📊 Recording start time:', this.recordingStartTime);
    } catch (error) {
      console.error('Failed to start photo data recording:', error);
      this.cleanup();
      throw error;
    }
  }

  recordPhotoData(photoUri: string): void {
    if (!this.isRecording || !this.latestRotation) {
      console.warn('Cannot record photo data: not recording or no rotation data available');
      return;
    }

    const dataPoint: PhotoData = {
      index: this.currentIndex,
      alpha: this.latestRotation.alpha,
      beta: this.latestRotation.beta,
      gamma: this.latestRotation.gamma,
      timestamp: Date.now(),
      photoUri: photoUri,
    };
    
    this.photoData.push(dataPoint);
    this.currentIndex++;
    
    console.log('📊 Photo data recorded (total: ' + this.photoData.length + '):', dataPoint);
  }

  stopRecording(): PhotoData[] {
    const stopTime = Date.now();
    console.log('🛑 stopRecording called at:', stopTime);
    console.log('🛑 Recording duration:', stopTime - this.recordingStartTime, 'ms');
    console.log('🛑 Current isRecording state:', this.isRecording);
    console.log('🛑 Current data points before stop:', this.photoData.length);
    
    // IMMEDIATELY set isRecording to false to prevent any new data
    this.isRecording = false;
    
    // Make a copy of the data BEFORE cleanup
    const recordedData = [...this.photoData];
    
    // Clean up subscriptions
    this.cleanup();
    
    console.log('✅ Photo recording stopped. Total data points:', recordedData.length);
    console.log('📊 Recording was active for:', stopTime - this.recordingStartTime, 'ms');
    
    if (recordedData.length > 0) {
      console.log('📊 First data point:', recordedData[0]);
      console.log('📊 Last data point:', recordedData[recordedData.length - 1]);
      console.log('📊 Full photo data JSON:', JSON.stringify(recordedData, null, 2));
    }
    
    return recordedData;
  }

  private cleanup(): void {
    // Remove the subscription
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('🔄 DeviceMotion subscription removed');
    }
  }

  getRecordedData(): PhotoData[] {
    return [...this.photoData];
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getCurrentPhotoCount(): number {
    return this.photoData.length;
  }

  // Clean up resources when the recorder is no longer needed
  destroy(): void {
    this.isRecording = false;
    this.cleanup();
    this.photoData = [];
    this.latestRotation = null;
    this.currentIndex = 0;
  }
}

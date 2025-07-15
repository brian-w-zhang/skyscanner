export interface PhotoData {
  index: number;
  alpha: number;  // Keep these names for compatibility with existing Python code
  beta: number;
  gamma: number;
  timestamp: number;
  photoUri?: string;
}

export class PhotoDataRecorder {
  private isRecording = false;
  private photoData: PhotoData[] = [];
  private currentIndex = 0;
  private recordingStartTime: number = 0;

  constructor() {}

  async startRecording(): Promise<void> {
    // Clear any existing data and reset state
    this.photoData = [];
    this.currentIndex = 0;
    this.recordingStartTime = Date.now();
    this.isRecording = true;
    
    console.log('📷 Starting photo data recording...');
    console.log('✅ PhotoDataRecorder started successfully, isRecording:', this.isRecording);
    console.log('📊 Recording start time:', this.recordingStartTime);
  }

  recordPhotoData(photoUri: string, orientation: { pitch: number; yaw: number; roll: number }): void {
    if (!this.isRecording) {
      console.warn('Cannot record photo data: not recording');
      return;
    }

    const dataPoint: PhotoData = {
      index: this.currentIndex,
      // Map orientation tracker data to DeviceMotion equivalent naming for Python compatibility
      alpha: orientation.yaw,    // yaw -> alpha (Z-axis rotation)
      beta: orientation.pitch,   // pitch -> beta (X-axis rotation)  
      gamma: orientation.roll,   // roll -> gamma (Y-axis rotation)
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
    
    // Set isRecording to false
    this.isRecording = false;
    
    // Make a copy of the data
    const recordedData = [...this.photoData];
    
    console.log('✅ Photo recording stopped. Total data points:', recordedData.length);
    console.log('📊 Recording was active for:', stopTime - this.recordingStartTime, 'ms');
    
    if (recordedData.length > 0) {
      console.log('📊 First data point:', recordedData[0]);
      console.log('📊 Last data point:', recordedData[recordedData.length - 1]);
      console.log('📊 Full photo data JSON:', JSON.stringify(recordedData, null, 2));
    }
    
    return recordedData;
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
    this.photoData = [];
    this.currentIndex = 0;
  }
}

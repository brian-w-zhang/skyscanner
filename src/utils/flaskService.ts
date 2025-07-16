import * as FileSystem from 'expo-file-system';
import { PhotoData } from './photoDataRecorder';

export interface FlaskResponse {
  success: boolean;
  download_url?: string;
  session_id?: string;
  photos_processed?: number;
  error?: string;
  message?: string;
}

export class FlaskService {
  private baseUrl: string;

  constructor(flaskServerUrl: string = 'http://192.168.1.100:5000') {
    this.baseUrl = flaskServerUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Flask health check failed:', error);
      return false;
    }
  }

  async generateGLB(photoUris: string[], photoData: PhotoData[]): Promise<FlaskResponse> {
    try {
      console.log('🚀 Starting GLB generation via Flask...');
      console.log(`📸 Photos: ${photoUris.length}, Data points: ${photoData.length}`);

      // Create FormData
      const formData = new FormData();
      
      // Add photo data as JSON string
      formData.append('photoData', JSON.stringify(photoData));

      // Add photo files
      for (let i = 0; i < photoUris.length; i++) {
        const photoUri = photoUris[i];
        
        // Read file as blob
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (!fileInfo.exists) {
          throw new Error(`Photo ${i} does not exist: ${photoUri}`);
        }

        // Create file object for upload
        const fileName = `photo_${i}.jpg`;
        formData.append('photos', {
          uri: photoUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
      }

      console.log('📤 Uploading to Flask server...');
      
      // Send request to Flask
      const response = await fetch(`${this.baseUrl}/generate-glb`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Flask request failed');
      }

      console.log('✅ Flask processing completed:', responseData);
      return responseData;

    } catch (error) {
      console.error('❌ Flask service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async downloadGLB(sessionId: string, destinationPath: string): Promise<string | null> {
    try {
      console.log(`📥 Downloading GLB for session: ${sessionId}`);
      
      const downloadUrl = `${this.baseUrl}/download-glb/${sessionId}`;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, destinationPath);
      
      if (downloadResult.status === 200) {
        console.log('✅ GLB downloaded successfully:', downloadResult.uri);
        return downloadResult.uri;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      return null;
    }
  }

  getStreamUrl(sessionId: string): string {
    return `${this.baseUrl}/stream-glb/${sessionId}`;
  }
}

# 🌌 Skyscanner



This project is a reverse-engineered implementation of the obstruction detection tool in the Starlink app. It allows users to scan their environment using their phone's camera and sensors to identify obstructions in the sky that could interfere with satellite signals. The app processes the data and visualizes the results in an interactive 3D dome model.  

> **Note:** The `screen2` files in the project were created after migrating to a new method of capturing individual camera frames instead of recording a video. The older video-based implementation is still present in the project but is no longer actively used.  

---

## 🚀 How to Run

### Frontend
1. Navigate to the root directory of the project.  
2. Run `npm install` to install dependencies.  
3. Start the Expo development server with `npm run start`.  
4. Use the Expo Go app or an emulator to run the app on your device.  

### Backend
1. Navigate to the `flask` directory.  
2. Install Python dependencies with `pip install -r requirements.txt`.  
3. Start the Flask server with `python flask_server.py`.  
4. Make sure to configure the Flask server IP in `flaskService.ts` and other relevant files to match your local network IP.  

---

## ✨ Features
- Sky scanning using the phone's camera and sensors.  
- Real-time progress tracking with a circular progress ring.  
- 3D visualization of obstructions using Three.js.  
- Flask backend for processing photos and generating 3D models.  
- Interactive 3D UI with additions like orbit controls, custom themes, camera orientation mirroring, and more.  

---

## 🛠 Challenges and Workarounds

### 📡 Sensor Data Accuracy
One of the main challenges was the inaccuracy of data from expo-sensor, given that it's not a native module. In particular yaw (compass heading) was innacurate / didn't flip when users point their phone camera toward the sky. This was critical for orientation tracking and ensuring the 3D dome mirrored the physical device's rotation.  

- The gyroscope proved to be more reliable than the magnetometer for smoother performance, so it became the primary sensor for orientation tracking.  
- However, gyroscope drift remained an issue. A workaround was implemented by guiding users to point their phone at the sky using the accelerometer first.  
- While this improved accuracy, it wasn't perfect and couldn’t always render the dome at the true north pole (directly above the user). This remains an area for potential improvement.  

---

### ☁️ Sky Segmentation
Finding pretrained machine learning models for sky segmentation was another hurdle.  

- Several models were identified and tested locally. While some worked well, my machine couldn’t support them without a dedicated graphics card.  
- As a result, I migrated to a more lightweight OpenCV-based solution, adapted from code found on Hugging Face.  
- The end goal is to eventually integrate a robust ML model that can be preloaded with Expo assets, similar to the production app.  

---

### 🌐 Spherical Geometry Creation
- Initially, I considered filming a video and annotating timestamps with rotation data to create a richer pool of camera frames for more accurate spherical geometry.  
- However, this approach had drawbacks: video frames were often blurrier, and synchronizing the video recorder with the orientation recorder was inconsistent, leading to a persistent offset in rotation data.  
- I also attempted to create a spherical panorama directly from video frames, but the results were poor and appeared distorted and unusable.  

The workaround was to adapt the process to use **individual camera frames**, similar to the production app. By controlling the interval between frames, I struck a balance between accuracy and frontend performance. Sky segmentation was applied to each photo individually, and the rotation data was combined with the photo's aspect ratio to generate a matrix of annotated spherical coordinates. This matrix was then used to create the 3D data texture more reliably.  

---

### 📦 Serving the GLB File
- Generating and serving the GLB file presented its own set of challenges.  
- The Flask server required API requests to generate the model, and loading the GLB file on the phone involved using Expo assets.  
- However, redownloading the GLB file every time proved to be very slow.  

For development, the Flask server was designed to modify a specific file path that could be refetched and rerendered directly in the app while running locally. This significantly improved speed during development.  

In a production environment, this approach would need to be rethought—potentially eliminating the need for Flask altogether with a more intelligent architecture.  

---

### 🌟 Magnet-like Collection for Stars
One feature I wanted to implement was a “magnet-like” effect for the stars in the 3D camera overlay display. This would mimic how coins are collected by a magnet in games like *Subway Surfers*.  

- The idea was to have stars dynamically move toward the center of the screen when scanned, accompanied by haptic feedback for a satisfying user experience. This effect is present in the existing Starlink app and adds a polished, interactive feel.  
- However, I struggled with the implementation. Adding more complex animations to the stars often caused delays or drops in the smoothness of the `CameraController`’s orientation updates. This created a noticeable lag in the user experience, which was too big of a sacrifice for the feature.  

Despite experimenting with optimizations, the trade-off between animation complexity and real-time performance was not acceptable. This remains a feature I would like to revisit in the future with better performance tuning.  

---

## 🧩 Key Components
- **`CameraScreen2`**: Handles the sky scanning process, including capturing photos and tracking device orientation.  
- **`ObstructionScreen`**: Displays the 3D dome model with obstruction data.  
- **Flask Server**: Processes photos, generates masks, and creates 3D models.  
- **`OrientationTracker`**: Tracks device orientation using gyroscope, accelerometer, and magnetometer data.  
- **`ScanTracker`**: Calculates sky coverage and tracks scanned areas.  

---

## ⚠️ Notes
- Ensure your phone and computer are on the same WiFi network for the Flask server to work.  
- The app uses Expo's managed workflow, so you can run it on both iOS and Android devices.  

---

## 🎯 Summary
This project demonstrates how to combine **React Native**, **Expo**, **Expo**, **Three.js** (via **R3F**), and **Flask** to create a functional and interactive tool for real-world applications, while addressing various technical challenges along the way.  

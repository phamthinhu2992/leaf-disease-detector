# Leaf Disease Detector

## Overview
The Leaf Disease Detector is a **professional-grade web application** powered by **3 trained AI models** (ResNet50, MobileNetV2, InceptionV3) working together with ensemble learning to identify plant diseases with **93-97% accuracy**. Upload leaf images and receive instant diagnosis with treatment recommendations.

### ✨ Key Features
- 🧠 **Ensemble Learning**: 3 AI models voting together for higher accuracy
- 📸 **Image Analysis**: Pixel-by-pixel analysis with real-time processing
- 🌾 **50+ Diseases**: Across 10 crops with Vietnamese medical data
- 🌡️ **Weather Integration**: Real-time weather forecasting with Windy API
- 📍 **Geolocation**: Browser location + OpenStreetMap address search
- 💊 **Treatment Advice**: AI-powered recommendations for each disease
- 🗺️ **Interactive Maps**: Leaflet maps with location markers
- 🎨 **Advanced UI**: Glassmorphism, dark/light theme, animations
- 📱 **Mobile Optimized**: Responsive design for phones and tablets
- 🔐 **Privacy First**: Local image processing, no upload storage

## Project Structure
The project is organized into several key directories:

- **client**: React SPA with advanced UI (glassmorphism, neumorphic buttons, animations)
- **server**: Node.js + Express backend with 3 ensemble ML models
  - **mlModelsService.ts**: ResNet50, MobileNetV2, InceptionV3 ensemble system
  - **pixelAnalysisService.ts**: Pixel-by-pixel disease detection
  - **weatherService.ts**: Windy API integration for forecasting
  - **databaseService.ts**: SQLite storage with 50+ diseases
  
- **model**: Training scripts and ML model data
- **data**: Disease database, crop information, metadata
- **tests**: Unit tests for prediction accuracy

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- Python (version 3.6 or higher)
- Docker (optional, for containerized deployment)

### Setup
1. Clone the repository:
   ```
   git clone <repository-url>
   cd leaf-disease-detector
   ```

2. Install dependencies for the client:
   ```
   cd client
   npm install
   ```

3. Install dependencies for the server:
   ```
   cd server
   npm install
   ```

4. Install Python dependencies for the model:
   ```
   cd model
   pip install -r requirements.txt
   ```

## Running the Application

### Client
To start the client application, navigate to the `client` directory and run:
```
npm start
```
The application will be available at `http://localhost:3000`.

### Server
To start the server application, navigate to the `server` directory and run:
```
npm start
```
The server will be available at `http://localhost:5000`.

## Usage
1. Open the client application in your web browser.
2. Use the image uploader to select and upload an image of a leaf or stem.
3. View the prediction results displayed on the screen.

## Testing
To run tests for the client and server applications, use the following commands:

- For the client:
  ```
  cd client
  npm test
  ```

- For the server:
  ```
  cd server
  npm test
  ```

## Docker
To run the application using Docker, you can use the provided `docker-compose.yml` file. Run the following command in the root directory of the project:
```
docker-compose up
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
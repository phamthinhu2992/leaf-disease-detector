# Leaf Disease Detector

## Overview
The Leaf Disease Detector is a web application designed to help users identify plant diseases through image analysis. By uploading images of leaves or stems, users can receive predictions about potential diseases, enabling timely intervention and care for their plants.

## Project Structure
The project is organized into several key directories:

- **client**: Contains the front-end React application.
  - **public**: Static files, including the main HTML file.
  - **src**: Source code for the React application, including components and styles.
  
- **server**: Contains the back-end Node.js application.
  - **src**: Source code for the server, including routes, controllers, and services.
  
- **model**: Contains files related to the machine learning model, including training scripts and notebooks.
  
- **data**: Contains datasets used for training the model, including metadata and annotations.
  
- **tests**: Contains test files for both the client and server applications.

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
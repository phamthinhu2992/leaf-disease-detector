import request from 'supertest';
import app from '../../src/index'; // Adjust the path as necessary
import { PredictionResponse } from '../../src/types'; // Adjust the path as necessary

describe('Prediction API', () => {
  it('should return a prediction for a valid image', async () => {
    const response = await request(app)
      .post('/api/predict')
      .attach('image', 'path/to/test/image.jpg'); // Provide a valid test image path

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('prediction');
    expect(response.body.prediction).toBeDefined();
  });

  it('should return an error for an invalid image', async () => {
    const response = await request(app)
      .post('/api/predict')
      .attach('image', 'path/to/invalid/image.txt'); // Provide an invalid test image path

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
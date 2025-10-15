import express from 'express';
import { predictImage } from '../controllers/predictController';

const router = express.Router();

router.post('/predict', predictImage);

export default router;
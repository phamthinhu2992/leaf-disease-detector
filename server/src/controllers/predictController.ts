import { Request, Response } from 'express';
import { predictImage } from '../services/modelService';
import { processImage } from '../utils/imageProcessing';

export const predictController = async (req: Request, res: Response) => {
    try {
        const image = req.file?.buffer; // Assuming the image is sent as a buffer
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const processedImage = await processImage(image);
        const prediction = await predictImage(processedImage);

        return res.status(200).json({ prediction });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while processing the image' });
    }
};
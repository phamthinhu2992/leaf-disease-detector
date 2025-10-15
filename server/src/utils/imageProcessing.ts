import sharp from 'sharp';

export const processImage = async (buffer: Buffer): Promise<Buffer> => {
    try {
        const processedImage = await sharp(buffer)
            .resize(256, 256) // Resize to 256x256 pixels
            .toFormat('jpeg') // Convert to JPEG format
            .jpeg({ quality: 90 }) // Set JPEG quality
            .toBuffer();
        return processedImage;
    } catch (error) {
        throw new Error('Error processing image: ' + error.message);
    }
};

export const validateImage = (buffer: Buffer): boolean => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const imageType = buffer.toString('base64').substring(0, 10); // Check the first few bytes for type
    return validImageTypes.some(type => imageType.includes(type));
};
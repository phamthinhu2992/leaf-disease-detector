"""
Image Segmentation Service for Leaf Disease Detection
======================================================
Separates disease regions from healthy leaf background using U-Net architecture.
Enables the model to focus analysis on affected areas for improved accuracy.

Features:
- U-Net segmentation model
- Disease region isolation
- Mask refinement and post-processing
- Integration with attention mechanisms
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
import numpy as np
import cv2
from typing import Tuple, Optional, Union
from scipy import ndimage
import os


class UNetSegmentation(models.Model):
    """U-Net Architecture for Leaf Disease Segmentation
    
    Efficiently segments leaf images to separate healthy regions (background)
    from diseased regions (foreground), enabling focused disease analysis.
    """
    
    def __init__(
        self,
        input_shape: Tuple[int, int, int] = (256, 256, 3),
        num_filters: int = 64,
        depth: int = 4,
        dropout_rate: float = 0.3,
        **kwargs
    ):
        super(UNetSegmentation, self).__init__(**kwargs)
        
        self.input_shape_val = input_shape
        self.num_filters = num_filters
        self.depth = depth
        self.dropout_rate = dropout_rate
        
        self.model = self._build_unet()
    
    def _conv_block(self, x, num_filters, kernel_size=3):
        """Double convolution block with batch normalization"""
        
        x = layers.Conv2D(
            num_filters,
            kernel_size,
            padding='same',
            activation='relu',
            kernel_initializer='he_normal'
        )(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.dropout_rate)(x)
        
        x = layers.Conv2D(
            num_filters,
            kernel_size,
            padding='same',
            activation='relu',
            kernel_initializer='he_normal'
        )(x)
        x = layers.BatchNormalization()(x)
        
        return x
    
    def _build_unet(self):
        """Build complete U-Net architecture"""
        
        inputs = keras.Input(shape=self.input_shape_val)
        
        # Encoder path
        encoder_blocks = []
        x = inputs
        
        for i in range(self.depth):
            filters = self.num_filters * (2 ** i)
            x = self._conv_block(x, filters)
            encoder_blocks.append(x)
            
            if i < self.depth - 1:
                x = layers.MaxPooling2D(2)(x)
        
        # Decoder path
        for i in range(self.depth - 2, -1, -1):
            filters = self.num_filters * (2 ** i)
            x = layers.UpSampling2D(2)(x)
            x = layers.Concatenate()([x, encoder_blocks[i]])
            x = self._conv_block(x, filters)
        
        # Output layer: binary segmentation mask
        outputs = layers.Conv2D(1, 1, activation='sigmoid')(x)
        
        return models.Model(inputs=inputs, outputs=outputs)
    
    def call(self, inputs, training=None):
        return self.model(inputs, training=training)


class SegmentationPreprocessor:
    """Preprocessing pipeline for segmentation-aware disease detection"""
    
    def __init__(
        self,
        target_size: Tuple[int, int] = (256, 256),
        threshold_method: str = 'adaptive',
        morphology_kernel_size: int = 5
    ):
        """Initialize preprocessor
        
        Args:
            target_size: Target image size for segmentation
            threshold_method: 'adaptive', 'otsu', or 'binary'
            morphology_kernel_size: Kernel size for morphological operations
        """
        self.target_size = target_size
        self.threshold_method = threshold_method
        self.kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (morphology_kernel_size, morphology_kernel_size)
        )
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for segmentation
        
        Converts BGR to RGB, normalizes to [0, 1], and resizes to target size.
        """
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to target size
        image = cv2.resize(image, self.target_size)
        
        # Normalize to [0, 1]
        if image.dtype == np.uint8:
            image = image.astype(np.float32) / 255.0
        
        return image
    
    def postprocess_mask(
        self,
        mask: np.ndarray,
        threshold: float = 0.5,
        min_area: int = 100,
        apply_morphology: bool = True
    ) -> np.ndarray:
        """Post-process predicted segmentation mask
        
        Applies thresholding, morphological operations, and artifact removal.
        """
        # Threshold
        binary_mask = (mask > threshold).astype(np.uint8) * 255
        
        # Morphological operations
        if apply_morphology:
            binary_mask = cv2.morphologyEx(
                binary_mask,
                cv2.MORPH_CLOSE,
                self.kernel,
                iterations=2
            )
            binary_mask = cv2.morphologyEx(
                binary_mask,
                cv2.MORPH_OPEN,
                self.kernel,
                iterations=1
            )
        
        # Remove small components (noise)
        labeled, num_features = ndimage.label(binary_mask)
        sizes = ndimage.sum(binary_mask, labeled, range(num_features + 1))
        
        binary_mask[sizes[labeled] < min_area] = 0
        
        # Keep only the largest connected component (the leaf)
        labeled, num_features = ndimage.label(binary_mask)
        if num_features > 0:
            sizes = ndimage.sum(binary_mask, labeled, range(num_features + 1))
            largest_label = np.argmax(sizes[1:]) + 1
            binary_mask = (labeled == largest_label).astype(np.uint8) * 255
        
        return binary_mask
    
    def extract_leaf_region(
        self,
        image: np.ndarray,
        mask: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Extract leaf region from image using mask
        
        Returns:
            (masked_image, disease_regions): Image with background removed and disease areas
        """
        # Normalize mask to [0, 1]
        if mask.dtype == np.uint8:
            mask_normalized = mask.astype(np.float32) / 255.0
        else:
            mask_normalized = mask
        
        # Apply mask to image
        if len(image.shape) == 2:  # Grayscale
            masked_image = image * mask_normalized
        else:  # Color
            masked_image = image * np.expand_dims(mask_normalized, axis=-1)
        
        return masked_image.astype(np.float32), mask_normalized
    
    def detect_disease_regions(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        color_threshold: float = 0.3
    ) -> np.ndarray:
        """Detect potential disease regions within leaf area
        
        Uses color deviation from healthy leaf green to identify affected areas.
        """
        # Convert to HSV for color-based detection
        image_uint8 = (image * 255).astype(np.uint8) if image.dtype != np.uint8 else image
        
        if len(image_uint8.shape) == 2:
            return mask
        
        hsv = cv2.cvtColor(image_uint8, cv2.COLOR_RGB2HSV)
        
        # Healthy leaf green hue range (adjust based on local crop characteristics)
        lower_green = np.array([30, 30, 30], dtype=np.uint8)
        upper_green = np.array([90, 255, 200], dtype=np.uint8)
        
        # Create green mask
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Invert to get potential disease areas
        disease_regions = cv2.bitwise_not(green_mask)
        
        # Combine with leaf mask
        disease_regions = cv2.bitwise_and(disease_regions, mask.astype(np.uint8))
        
        return disease_regions.astype(np.float32) / 255.0


class SegmentationService:
    """Complete segmentation service for disease detection"""
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        target_size: Tuple[int, int] = (256, 256),
        create_new_model: bool = True
    ):
        """Initialize segmentation service
        
        Args:
            model_path: Path to saved segmentation model
            target_size: Target size for segmentation
            create_new_model: Whether to create new model if path not found
        """
        self.target_size = target_size
        self.preprocessor = SegmentationPreprocessor(target_size=target_size)
        
        if model_path and os.path.exists(model_path):
            self.model = keras.models.load_model(model_path)
        elif create_new_model:
            self.model = UNetSegmentation(
                input_shape=(*target_size, 3),
                num_filters=32,
                depth=4,
                dropout_rate=0.3
            )
        else:
            self.model = None
    
    def segment_image(
        self,
        image: np.ndarray,
        return_mask: bool = True,
        return_disease_regions: bool = True
    ) -> dict:
        """Segment image to isolate leaf and disease regions
        
        Args:
            image: Input image (H, W, 3)
            return_mask: Whether to return segmentation mask
            return_disease_regions: Whether to return disease region map
        
        Returns:
            Dictionary containing:
                - 'masked_image': Image with background removed
                - 'mask': Segmentation mask (optional)
                - 'disease_regions': Disease area map (optional)
                - 'confidence': Model confidence score
        """
        if self.model is None:
            raise RuntimeError("Segmentation model not loaded")
        
        # Preprocess
        preprocessed = self.preprocessor.preprocess_image(image)
        preprocessed_batch = np.expand_dims(preprocessed, axis=0)
        
        # Predict
        mask_pred = self.model(preprocessed_batch).numpy()[0, :, :, 0]
        
        # Post-process mask
        mask_binary = self.preprocessor.postprocess_mask(mask_pred, threshold=0.5)
        
        # Extract masked image
        masked_image, mask_normalized = self.preprocessor.extract_leaf_region(
            preprocessed,
            mask_binary
        )
        
        result = {
            'masked_image': masked_image,
            'confidence': float(mask_pred.max()),
            'original_shape': image.shape
        }
        
        if return_mask:
            result['mask'] = mask_normalized
        
        if return_disease_regions:
            disease_regions = self.preprocessor.detect_disease_regions(
                preprocessed,
                mask_normalized
            )
            result['disease_regions'] = disease_regions
        
        return result
    
    def compile_for_training(self, learning_rate: float = 1e-3):
        """Compile model for training"""
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss='binary_crossentropy',
            metrics=[
                'mae',
                keras.metrics.Precision(),
                keras.metrics.Recall(),
                keras.metrics.IoU(num_classes=2, target_class_ids=[0, 1])
            ]
        )
    
    def save_model(self, model_path: str):
        """Save model to disk"""
        if self.model is not None:
            self.model.save(model_path)
    
    def get_model_summary(self) -> str:
        """Get model architecture summary"""
        import io
        
        string_buffer = io.StringIO()
        self.model.summary(print_fn=lambda x: string_buffer.write(x + '\n'))
        return string_buffer.getvalue()


# Example usage
if __name__ == '__main__':
    print("=" * 80)
    print("Leaf Disease Segmentation Service")
    print("=" * 80)
    
    # Create service
    print("\nCreating segmentation service...")
    service = SegmentationService(create_new_model=True)
    
    # Compile model
    service.compile_for_training()
    print(service.get_model_summary())
    
    # Test with dummy data
    print("\nTesting with dummy image...")
    dummy_image = np.random.rand(256, 256, 3).astype(np.float32)
    
    result = service.segment_image(dummy_image)
    
    print(f"Input shape: {dummy_image.shape}")
    print(f"Masked image shape: {result['masked_image'].shape}")
    print(f"Mask shape: {result['mask'].shape}")
    print(f"Disease regions shape: {result['disease_regions'].shape}")
    print(f"Model confidence: {result['confidence']:.4f}")
    
    print("\n" + "=" * 80)
    print("✓ Segmentation service initialized successfully!")

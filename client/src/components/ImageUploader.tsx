import React, { useState } from 'react';

interface PredictionResult {
  success: boolean;
  prediction: {
    prediction: string;
    confidence: number;
    originalPrediction: string;
    source: string;
    modelInfo?: {
      name: string;
      version: string;
      modelsUsed: number;
      totalModels: number;
    };
    processingTime: number;
    detailedAnalysisReport?: any;
    detailedAnalysisFormatted?: string;
  };
  imageInfo?: {
    filename: string;
    size: number;
    contentType: string;
  };
  timestamp: string;
}

const ImageUploader: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis customization options
  const [plantPart, setPlantPart] = useState<string>('leaves');
  const [environmentalCondition, setEnvironmentalCondition] = useState<string>('normal');
  const [urgencyLevel, setUrgencyLevel] = useState<string>('normal');
  const [diseaseHistory, setDiseaseHistory] = useState<string>('none');
  const [treatmentAttempted, setTreatmentAttempted] = useState<string>('none');

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('plantPart', plantPart);
    formData.append('environmentalCondition', environmentalCondition);
    formData.append('urgencyLevel', urgencyLevel);
    formData.append('diseaseHistory', diseaseHistory);
    formData.append('treatmentAttempted', treatmentAttempted);

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Sending prediction request...');
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to analyze image: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Raw API response:', data);
      console.log('📊 Prediction object:', data.prediction);
      console.log('🎯 Disease name:', data.prediction?.prediction);
      console.log('📈 Confidence:', data.prediction?.confidence);
      setResult(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🌿 Hệ Thống Nhận Diện Bệnh Lá Cây</h1>
        <p>Sử dụng AI tiên tiến để chẩn đoán bệnh cây trồng</p>
      </div>

      <div style={styles.content}>
        {/* Upload Section */}
        <div style={styles.section}>
          <h2>📸 Tải Ảnh Lá Cây</h2>

          <div style={styles.uploadBox}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.fileInput}
              id="imageInput"
            />
            <label htmlFor="imageInput" style={styles.uploadLabel}>
              {selectedImage ? '✅ Ảnh đã chọn: ' + selectedImage.name : '🖼️ Nhấp để chọn ảnh'}
            </label>
          </div>

          {preview && (
            <div style={styles.previewBox}>
              <img src={preview} alt="Preview" style={styles.previewImage} />
            </div>
          )}
        </div>

        {/* Options Section */}
        {selectedImage && (
          <div style={styles.section}>
            <h2>⚙️ Tùy Chỉnh Phân Tích</h2>

            <div style={styles.optionsGrid}>
              <div style={styles.optionGroup}>
                <label>🌱 Bộ Phận Cây:</label>
                <select
                  value={plantPart}
                  onChange={(e) => setPlantPart(e.target.value)}
                  style={styles.select}
                >
                  <option value="leaves">Lá</option>
                  <option value="stem">Thân</option>
                  <option value="root">Rễ</option>
                  <option value="flower">Hoa</option>
                  <option value="fruit">Quả</option>
                  <option value="whole">Toàn cây</option>
                </select>
              </div>

              <div style={styles.optionGroup}>
                <label>☀️ Điều Kiện Môi Trường:</label>
                <select
                  value={environmentalCondition}
                  onChange={(e) => setEnvironmentalCondition(e.target.value)}
                  style={styles.select}
                >
                  <option value="normal">Bình thường</option>
                  <option value="humid">Ẩm</option>
                  <option value="dry">Khô</option>
                  <option value="hot">Nóng</option>
                  <option value="cold">Lạnh</option>
                </select>
              </div>

              <div style={styles.optionGroup}>
                <label>⏰ Mức Độ Khẩn Cấp:</label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  style={styles.select}
                >
                  <option value="low">Thấp</option>
                  <option value="normal">Bình thường</option>
                  <option value="urgent">Khẩn cấp</option>
                  <option value="critical">Rất khẩn cấp</option>
                </select>
              </div>

              <div style={styles.optionGroup}>
                <label>📜 Tiền Sử Bệnh:</label>
                <select
                  value={diseaseHistory}
                  onChange={(e) => setDiseaseHistory(e.target.value)}
                  style={styles.select}
                >
                  <option value="none">Không có</option>
                  <option value="past">Từng có</option>
                  <option value="current">Đang có</option>
                  <option value="recurring">Tái phát</option>
                </select>
              </div>

              <div style={styles.optionGroup}>
                <label>💊 Đã Điều Trị:</label>
                <select
                  value={treatmentAttempted}
                  onChange={(e) => setTreatmentAttempted(e.target.value)}
                  style={styles.select}
                >
                  <option value="none">Chưa điều trị</option>
                  <option value="organic">Có cơ</option>
                  <option value="chemical">Hóa chất</option>
                  <option value="both">Cả hai</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedImage && (
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Đang phân tích...' : '🚀 Phân Tích Ảnh'}
          </button>
        )}

        {/* Error Section */}
        {error && (
          <div style={styles.errorBox}>
            <h3>❌ Lỗi:</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div style={styles.section}>
            <h2>📊 Kết Quả Phân Tích</h2>

            <div style={styles.resultBox}>
              <div style={styles.predictionCard}>
                <h3 style={styles.predictionTitle}>
                  🎯 Chẩn Đoán: {result.prediction.prediction}
                </h3>
                <p style={styles.confidence}>
                  Độ tin cậy: <strong>{(result.prediction.confidence * 100).toFixed(1)}%</strong>
                </p>
                <div style={{
                  ...styles.confidenceBadge,
                  backgroundColor: result.prediction.confidence >= 0.9 ? '#10b981' :
                    result.prediction.confidence >= 0.7 ? '#f59e0b' : '#ef4444'
                }}>
                  {result.prediction.confidence >= 0.9 ? '🎉 Rất chính xác' :
                    result.prediction.confidence >= 0.7 ? '👍 Khá chính xác' : '⚠️ Cần kiểm tra thêm'}
                </div>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <span style={styles.infoLabel}>⏱️ Thời gian xử lý:</span>
                  <span>{result.prediction.processingTime} ms</span>
                </div>
                <div style={styles.infoCard}>
                  <span style={styles.infoLabel}>📁 Kích thước:</span>
                  <span>{result.imageInfo ? (result.imageInfo.size / 1024).toFixed(2) : 'N/A'} KB</span>
                </div>
                {result.prediction.modelInfo && (
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>🤖 AI Models:</span>
                    <span>{result.prediction.modelInfo.modelsUsed}/{result.prediction.modelInfo.totalModels}</span>
                  </div>
                )}
                <div style={styles.infoCard}>
                  <span style={styles.infoLabel}>🕐 Thời gian:</span>
                  <span>{new Date(result.timestamp).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {result.prediction.detailedAnalysisFormatted && (
                <div style={styles.analysisBox}>
                  <h3>📋 Phân Tích Chi Tiết</h3>
                  <pre style={styles.analysisText}>
                    {result.prediction.detailedAnalysisFormatted}
                  </pre>
                </div>
              )}

              {(result.prediction as any).analysisDetails && (
                <div style={styles.analysisBox}>
                  <h3>🔬 Chi Tiết Phân Tích Pixel</h3>
                  <div style={styles.detailsGrid}>
                    {(result.prediction as any).analysisDetails.pixelAnalysis && (
                      <div style={styles.detailCard}>
                        <h4>🎨 Phân Tích Màu Sắc:</h4>
                        <ul style={styles.detailsList}>
                          <li>💚 Green: {(result.prediction as any).analysisDetails.pixelAnalysis.greenPixels || 0}</li>
                          <li>🟤 Brown: {(result.prediction as any).analysisDetails.pixelAnalysis.brownPixels || 0}</li>
                          <li>🔴 Red: {(result.prediction as any).analysisDetails.pixelAnalysis.redPixels || 0}</li>
                          <li>🟡 Yellow: {(result.prediction as any).analysisDetails.pixelAnalysis.yellowPixels || 0}</li>
                          <li>⚫ Black: {(result.prediction as any).analysisDetails.pixelAnalysis.blackPixels || 0}</li>
                        </ul>
                      </div>
                    )}
                    {(result.prediction as any).analysisDetails.diseaseMarkers && (
                      <div style={styles.detailCard}>
                        <h4>🦠 Dấu Hiệu Bệnh:</h4>
                        <ul style={styles.detailsList}>
                          <li>🟤 Brown Spots: {(result.prediction as any).analysisDetails.diseaseMarkers.brownSpots || 0}</li>
                          <li>🔴 Red Burning: {(result.prediction as any).analysisDetails.diseaseMarkers.redBurning || 0}</li>
                          <li>🟡 Yellowing: {(result.prediction as any).analysisDetails.diseaseMarkers.yellowingAreas || 0}</li>
                          <li>⚫ Black Necrosis: {(result.prediction as any).analysisDetails.diseaseMarkers.blackNecrosis || 0}</li>
                          <li>🔪 Edge Damage: {(result.prediction as any).analysisDetails.diseaseMarkers.leafEdgeDamage || 0}</li>
                        </ul>
                      </div>
                    )}
                    <div style={styles.detailCard}>
                      <h4>📊 Chỉ Số Sức Khỏe:</h4>
                      <ul style={styles.detailsList}>
                        <li>⚠️ Anomaly Score: {((result.prediction as any).analysisDetails.anomalyScore * 100).toFixed(1)}%</li>
                        <li>🎯 Severity: {(result.prediction as any).analysisDetails.severity || 'N/A'}</li>
                        <li>📍 Pattern: {(result.prediction as any).analysisDetails.spatialPattern || 'N/A'}</li>
                        <li>💚 Health Score: {((result.prediction as any).analysisDetails.leafHealthScore * 100).toFixed(1)}%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedImage(null);
                setPreview(null);
                setResult(null);
                setError(null);
              }}
              style={styles.buttonSecondary}
            >
              🔄 Phân Tích Ảnh Khác
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '30px',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  section: {
    marginBottom: '30px',
  },
  uploadBox: {
    position: 'relative',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    background: '#f8fafc',
  },
  fileInput: {
    display: 'none',
  },
  uploadLabel: {
    display: 'block',
    cursor: 'pointer',
    padding: '20px',
    fontSize: '16px',
    color: '#475569',
  },
  previewBox: {
    marginTop: '20px',
    textAlign: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px',
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  select: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'white',
  },
  button: {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    marginBottom: '20px',
  },
  buttonSecondary: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '15px',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #dc2626',
  },
  resultBox: {
    background: '#f1f5f9',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  predictionCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    borderLeft: '5px solid #667eea',
  },
  predictionTitle: {
    fontSize: '24px',
    margin: '0 0 10px 0',
    color: '#1e293b',
  },
  confidence: {
    fontSize: '18px',
    margin: '10px 0',
    color: '#475569',
  },
  confidenceBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '20px',
    color: 'white',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  infoCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#475569',
    fontSize: '14px',
  },
  analysisBox: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  analysisText: {
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    maxHeight: '300px',
    overflow: 'auto',
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
    marginTop: '12px',
  },
  detailCard: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  detailsList: {
    margin: '8px 0',
    paddingLeft: '20px',
    fontSize: '13px',
    lineHeight: '1.6',
  },
};

export default ImageUploader;
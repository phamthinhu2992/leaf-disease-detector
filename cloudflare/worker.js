// Cloudflare Worker for Leaf Disease AI Detection
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirect HTTP to HTTPS
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Main application routes
      if (url.pathname === '/' || url.pathname === '/test-upload') {
        return new Response(await getMainHTML(), {
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders
          }
        });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'Leaf Disease AI Detection'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // API routes
      if (url.pathname.startsWith('/api/')) {
        return await handleAPI(request, env, url);
      }

      // 404 for other routes
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

async function handleAPI(request, env, url) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Predict endpoint
  if (url.pathname === '/api/predict' && request.method === 'POST') {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const plantPart = formData.get('plantPart') || 'leaf';

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call AI prediction (simplified for Cloudflare Worker)
    const prediction = await callGeminiVision(base64, plantPart, env.GEMINI_API_KEY);

    return new Response(JSON.stringify(prediction), {
      headers: corsHeaders
    });
  }

  // Diseases endpoint
  if (url.pathname === '/api/diseases') {
    const diseases = await getDiseaseDatabase();
    return new Response(JSON.stringify(diseases), {
      headers: corsHeaders
    });
  }

  // Chat endpoint
  if (url.pathname === '/api/chat' && request.method === 'POST') {
    const { message } = await request.json();
    const response = await getChatResponse(message, env.GEMINI_API_KEY);
    return new Response(JSON.stringify({ response }), {
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
    status: 404,
    headers: corsHeaders
  });
}

async function callGeminiVision(base64Image, plantPart, apiKey) {
  const prompt = `Phân tích hình ảnh ${plantPart} của cây này và xác định:
1. Loại cây
2. Tình trạng sức khỏe
3. Bệnh (nếu có)
4. Mức độ nghiêm trọng (1-10)
5. Nguyên nhân có thể
6. Cách điều trị
7. Phòng ngừa

Trả lời bằng tiếng Việt, chi tiết và khoa học.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể phân tích hình ảnh';

    return {
      plantType: 'Cây trồng',
      plantPart: plantPart,
      confidence: 0.85,
      diseases: [{
        name: 'Phân tích AI',
        confidence: 0.85,
        description: analysis,
        severity: 'medium',
        treatment: 'Xem phân tích chi tiết',
        prevention: 'Theo dõi thường xuyên'
      }],
      aiAnalysis: analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      plantType: 'Không xác định',
      plantPart: plantPart,
      confidence: 0.1,
      diseases: [],
      aiAnalysis: 'Lỗi khi phân tích: ' + error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getChatResponse(message, apiKey) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Bạn là chuyên gia về bệnh cây trồng. Trả lời câu hỏi sau bằng tiếng Việt: ${message}`
          }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';

  } catch (error) {
    return 'Lỗi khi xử lý câu hỏi: ' + error.message;
  }
}

async function getDiseaseDatabase() {
  return {
    totalDiseases: 80,
    categories: ['Nấm', 'Vi khuẩn', 'Virus', 'Côn trùng', 'Dinh dưỡng'],
    diseases: [
      {
        id: 1,
        name: 'Bệnh đốm lá',
        category: 'Nấm',
        symptoms: 'Xuất hiện đốm nâu trên lá',
        treatment: 'Xịt thuốc diệt nấm',
        prevention: 'Thoát nước tốt, tránh tưới lên lá'
      }
      // More diseases would be added here
    ]
  };
}

async function getMainHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌿 AI Nhận Diện Bệnh Cây - Cloudflare</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 1rem;
            font-size: 2rem;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 2rem;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 3rem 2rem;
            text-align: center;
            background: #f8f9ff;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .upload-area:hover {
            background: #f0f2ff;
            border-color: #5a67d8;
        }
        .upload-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        input[type="file"] {
            display: none;
        }
        .btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            margin: 10px 5px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .camera-btn {
            background: linear-gradient(45deg, #4facfe, #00f2fe);
        }
        .plant-parts {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin: 1rem 0;
        }
        .part-btn {
            padding: 10px;
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        .part-btn.active, .part-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        #result {
            margin-top: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 10px;
            display: none;
        }
        .loading {
            text-align: center;
            color: #667eea;
            margin: 1rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌿 AI Nhận Diện Bệnh Cây</h1>
        <p class="subtitle">Powered by Cloudflare Workers & Gemini AI</p>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="plant-parts">
                <div class="part-btn active" data-part="leaf">🍃 Lá</div>
                <div class="part-btn" data-part="stem">🌱 Thân</div>
                <div class="part-btn" data-part="root">🌿 Rễ</div>
                <div class="part-btn" data-part="flower">🌸 Hoa</div>
                <div class="part-btn" data-part="fruit">🍎 Quả</div>
                <div class="part-btn" data-part="whole">🌳 Toàn bộ</div>
            </div>
            
            <div class="upload-area" onclick="document.getElementById('imageInput').click()">
                <div class="upload-icon">📁</div>
                <h3>Chọn ảnh từ máy</h3>
                <p>Kéo thả hoặc click để chọn</p>
                <input type="file" id="imageInput" name="image" accept="image/*">
            </div>
            
            <div style="text-align: center; margin-top: 1rem;">
                <button type="button" class="btn camera-btn" onclick="openCamera()">📸 Chụp ảnh</button>
                <button type="submit" class="btn">🔍 Phân tích</button>
            </div>
        </form>

        <video id="camera" style="display: none; width: 100%; border-radius: 10px; margin: 1rem 0;"></video>
        <canvas id="canvas" style="display: none;"></canvas>
        
        <div id="loading" class="loading" style="display: none;">
            <h3>🔄 Đang phân tích...</h3>
            <p>AI đang xử lý hình ảnh của bạn</p>
        </div>

        <div id="result"></div>
    </div>

    <script>
        let selectedPart = 'leaf';
        let stream = null;

        // Plant part selection
        document.querySelectorAll('.part-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedPart = this.dataset.part;
            });
        });

        // Camera functionality
        async function openCamera() {
            const video = document.getElementById('camera');
            const canvas = document.getElementById('canvas');
            
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                video.style.display = 'block';
                video.play();
                
                // Add capture button
                let captureBtn = document.getElementById('captureBtn');
                if (!captureBtn) {
                    captureBtn = document.createElement('button');
                    captureBtn.id = 'captureBtn';
                    captureBtn.className = 'btn';
                    captureBtn.innerHTML = '📸 Chụp';
                    captureBtn.onclick = capturePhoto;
                    video.parentNode.insertBefore(captureBtn, video.nextSibling);
                }
            } catch (error) {
                alert('Không thể truy cập camera: ' + error.message);
            }
        }

        function capturePhoto() {
            const video = document.getElementById('camera');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob(function(blob) {
                const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                document.getElementById('imageInput').files = dataTransfer.files;
                
                // Hide camera
                video.style.display = 'none';
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                
                // Show preview
                const img = document.createElement('img');
                img.src = canvas.toDataURL();
                img.style.width = '100%';
                img.style.borderRadius = '10px';
                img.style.margin = '1rem 0';
                
                const existing = document.querySelector('.photo-preview');
                if (existing) existing.remove();
                img.className = 'photo-preview';
                document.getElementById('uploadForm').appendChild(img);
                
            }, 'image/jpeg', 0.9);
        }

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const imageFile = document.getElementById('imageInput').files[0];
            
            if (!imageFile) {
                alert('Vui lòng chọn ảnh!');
                return;
            }
            
            formData.append('image', imageFile);
            formData.append('plantPart', selectedPart);
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            
            try {
                const response = await fetch('/api/predict', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                document.getElementById('loading').style.display = 'none';
                displayResult(data);
                
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                alert('Lỗi khi phân tích: ' + error.message);
            }
        });

        function displayResult(data) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = \`
                <h3>🎯 Kết quả phân tích</h3>
                <p><strong>Bộ phận:</strong> \${data.plantPart}</p>
                <p><strong>Độ tin cậy:</strong> \${(data.confidence * 100).toFixed(1)}%</p>
                <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px;">
                    <h4>📋 Phân tích AI:</h4>
                    <p style="white-space: pre-wrap;">\${data.aiAnalysis}</p>
                </div>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    ⏰ \${new Date(data.timestamp).toLocaleString('vi-VN')}
                </p>
            \`;
            resultDiv.style.display = 'block';
        }
    </script>
</body>
</html>`;
}
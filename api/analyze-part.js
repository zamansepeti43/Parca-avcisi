export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Vision AI henüz yapılandırılmadı.' });

  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== 'string') return res.status(400).json({ error: 'Görsel bulunamadı.' });
    if (imageDataUrl.length > 6_000_000) return res.status(413).json({ error: 'Görsel çok büyük.' });

    const prompt = `Sen Parça Avcısı'nın otomotiv yedek parça görsel analiz motorusun. Fotoğraftaki parçayı mümkün olduğunca dikkatli tanı. Sadece fotoğrafta görülen veya güçlü biçimde desteklenen bilgileri doldur; emin olmadığın alanları boş bırak ve uydurma OEM/araç uyumluluğu üretme. Kategoriyi Türkçe seç. Çıktıyı SADECE geçerli JSON olarak döndür. Şema: {"partName":"","category":"","subcategory":"","brand":"","model":"","oemNumber":"","vehicle":"","title":"","description":"","confidence":0,"requiresReview":true}. category için mümkünse şu sınıflardan birini kullan: Motor, Şanzıman, Kaporta, Aydınlatma, Fren Sistemi, Süspansiyon, Direksiyon, Elektrik, Soğutma, Yakıt Sistemi, Egzoz, Klima, İç Donanım, Dış Donanım, Filtreler, Jant & Lastik, Aksesuar, Diğer. description kısa ve profesyonel bir ilan açıklaması olsun. confidence 0-100 arası sayı olsun.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: imageDataUrl.match(/^data:([^;]+);/)?.[1] || 'image/webp', data: imageDataUrl.replace(/^data:[^;]+;base64,/, '') } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });

    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: payload?.error?.message || 'Vision AI isteği başarısız.' });
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '{}';
    const result = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
    return res.status(200).json({ result, model: 'gemini-2.5-flash-lite' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Vision AI analiz hatası.' });
  }
}

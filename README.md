# 🌿 NadiKampus: Sistem Analisis Wellbeing & Klaster Mahasiswa

> **Platform Analisis Data Institusional Mahasiswa Berbasis Algoritma K-Means Clustering dan Natural Language Processing (NLP).**

---

## 📌 Gambaran Proyek

**NadiKampus** adalah platform analitik cerdas yang dirancang untuk pengambil kebijakan perguruan tinggi (Pimpinan Universitas, Dekanat, Dosen Wali, dan Direktorat Kemahasiswaan) dalam memetakan kondisi psikososial, tekanan akademik, serta aspirasi mahasiswa secara objektif berbasis bukti (*data-driven decision making*).

Sistem ini mengintegrasikan:
1. **Machine Learning Clustering (K-Means, $k=4$)**: Segmentasi profil risiko dan potensi mahasiswa dengan metrik *Silhouette Score* **0,71**.
2. **Natural Language Processing (NLP)**: Analisis sentimen dan penambangan topik dari ribuan suara komentar terbuka mahasiswa.
3. **Interactive Intelligence Console**: Antarmuka dashboard institusional berbasis web dengan visualisasi *Scatter Plot* PCA 2D interaktif, grafik tren, serta katalog rekomendasi intervensi.

---

## 📂 Struktur Direktori Proyek

```text
nadi-kampus-web/
├── api/
│   └── main.py                     # Layanan API backend (FastAPI) & endpoint prediksi klaster
├── data/
│   ├── raw/
│   │   └── data_survei_mahasiswa.csv # Data mentah survei (2.481 responden mahasiswa)
│   └── processed/
│       └── student_features_clean.csv # Fitur hasil normalisasi & koordinat PCA 2D
├── frontend/
│   ├── css/
│   │   └── style.css               # Desain sistem modular, tema institusional terpadu
│   ├── js/
│   │   ├── app.js                  # Logika aplikasi, navigasi view, filter fakultas
│   │   ├── charts.js               # Engine grafik SVG dinamis (PCA Scatter, Donut, Rings)
│   │   ├── data.js                 # Dataset frontend, koordinat centroid, & NLP
│   │   └── landing.js              # Interaktivitas landing page
│   ├── dashboard.html              # Halaman utama Intelligence Dashboard Console
│   └── index.html                  # Halaman beranda / landing page
├── models/
│   └── centroids.json              # Metadata model K-Means & koordinat titik centroid
├── notebooks/
│   ├── 01_eda_and_kmeans_clustering.ipynb # Analisis data, Elbow Method, Silhouette, & PCA
│   └── 02_nlp_sentiment_analysis.ipynb   # Prapemrosesan teks, analisis sentimen & topik
├── .dockerignore                   # Berkas pengabaian build Docker
├── .env.example                    # Contoh konfigurasi environment variables
├── .gitignore                      # Berkas pengabaian Git (Python, OS, Editor)
├── .python-version                 # Versi Python yang direkomendasikan (3.11.8)
├── Dockerfile                      # Konfigurasi container Docker
├── docker-compose.yml              # Orkestrasi Docker multi-container
├── railway.toml                    # Konfigurasi deployment platform Railway
├── render.yaml                     # Konfigurasi deployment platform Render
├── requirements.txt                # Dependensi pustaka Python
├── vercel.json                     # Konfigurasi routing & deployment Vercel
├── app.py                          # Entry point server aplikasi
└── README.md                       # Dokumentasi proyek
```

---

## 👥 Hasil Segmentasi Klaster Mahasiswa (K-Means, $k=4$)

Berdasarkan analisis klaster multi-dimensi (Wellbeing, Academic Pressure, Social Support, Career Readiness):

| Klaster | Nama Klaster | Porsi Mahasiswa | Karakteristik Utama | Rekomendasi Intervensi |
| :--- | :--- | :---: | :--- | :--- |
| **Klaster 1** | *Academic Pressure* | **27%** | Tekanan akademik tinggi, beban tugas berat | Mentoring beban SKS & konseling akademik |
| **Klaster 2** | *Career Concern* | **24%** | Cemas karier pasca kampus, butuh magang | *Career clinic*, sertifikasi, & bursa kerja |
| **Klaster 3** | *Social Adaptation* | **18%** | Kesepian, adaptasi sosial perantau | *Peer-support program* & komunitas inklusif |
| **Klaster 4** | *Balanced Wellbeing* | **31%** | Resilien, seimbang, adaptif | Dilibatkan sebagai *Student Ambassador* |

---

## 💻 Cara Menjalankan Aplikasi

### 1. Menjalankan Langsung dengan Python (Fullstack)
```bash
# Clone repository
git clone https://github.com/ardanrizky/nadi-kampus.git
cd nadi-kampus

# Buat virtual environment (opsional)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependensi
pip install -r requirements.txt

# Jalankan server
python app.py
```
Akses di peramban: `http://localhost:8000`

### 2. Menggunakan Docker
```bash
docker-compose up --build
```

---

## 🚀 Deployment

- **Vercel**: Mendukung *Zero-configuration deployment* melalui berkas `vercel.json`.
- **Render / Railway**: Cukup sambungkan repositori GitHub Anda; file `render.yaml` dan `railway.toml` akan mengonfigurasi otomatis.

---

## 📄 Lisensi
Hak Cipta © 2026 NadiKampus. Dikembangkan untuk keperluan riset analitik institusi pendidikan tinggi.

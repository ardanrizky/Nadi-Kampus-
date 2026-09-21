# 🌿 NadiKampus: Sistem Analisis Wellbeing & Klaster Mahasiswa

> **Platform Analisis Data Institusional Mahasiswa Berbasis Algoritma K-Means Clustering dan Natural Language Processing (NLP).**

---

## 📌 Gambaran Proyek

**NadiKampus** adalah platform analitik cerdas yang dirancang untuk pengambil kebijakan perguruan tinggi (Pimpinan Universitas, Dekanat, Dosen Wali, dan Direktorat Kemahasiswaan) dalam memetakan kondisi psikososial, tekanan akademik, serta aspirasi mahasiswa secara objektif berbasis data (*data-driven decision making*).

Sistem ini mengintegrasikan:
1. **Machine Learning Clustering (K-Means, $k=4$)**: Segmentasi profil risiko dan potensi mahasiswa dengan metrik *Silhouette Score* **0,71**.
2. **Natural Language Processing (NLP)**: Analisis sentimen dan penambangan topik dari ribuan suara komentar terbuka mahasiswa.
3. **Interactive Intelligence Console**: Antarmuka dashboard institusional berbasis web dengan visualisasi *Scatter Plot* PCA 2D interaktif, grafik tren, serta katalog rekomendasi intervensi.

---

## 📂 Struktur Direktori Proyek

```text
nadi-kampus-web/
├── 📁 api/                      # Layanan API backend (FastAPI) & endpoint prediksi klaster
│   └── main.py
├── 📁 data/
│   ├── raw/                    # Data mentah survei (2.481 responden mahasiswa)
│   │   └── data_survei_mahasiswa.csv
│   └── processed/              # Fitur hasil normalisasi & koordinat PCA 2D
│       └── student_features_clean.csv
├── 📁 frontend/                # Antarmuka web pengguna (HTML, CSS, JS)
│   ├── css/
│   │   └── style.css           # Desain sistem modular & palet institusional
│   ├── js/
│   │   ├── app.js              # Logika aplikasi, navigasi view, filter fakultas
│   │   ├── charts.js           # Engine grafik SVG dinamis (PCA Scatter, Donut, Rings)
│   │   ├── data.js             # Dataset frontend, koordinat centroid, & NLP
│   │   └── landing.js          # Interaktivitas landing page
│   ├── dashboard.html          # Halaman utama Intelligence Dashboard Console
│   └── index.html              # Halaman beranda / landing page
├── 📁 models/                   # Model & metadata titik centroid K-Means (k=4)
│   └── centroids.json
├── 📁 notebooks/                # Jupyter Notebooks untuk riset & eksperimen pemodelan
│   ├── 01_eda_and_kmeans_clustering.ipynb   # Elbow Method, Silhouette Score (0.71), & PCA 2D
│   └── 02_nlp_sentiment_analysis.ipynb     # Prapemrosesan teks, sentimen, & ekstraksi topik
├── 📄 .gitignore               # Pengabaian berkas sistem, editor, dan cache Python
├── 🐍 app.py                   # Runner server lokal aplikasi
├── 📄 requirements.txt         # Daftar dependensi library Python
└── 📖 README.md                # Dokumentasi proyek
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

## 💻 Cara Menjalankan Proyek Secara Lokal

### Opsi 1: Menjalankan Server Python (Fullstack + API)
```bash
# 1. Install library yang dibutuhkan
pip install -r requirements.txt

# 2. Jalankan aplikasi
python app.py
```
Akses di browser: `http://localhost:8000`

### Opsi 2: Buka Antarmuka Langsung Tanpa Python
Anda juga dapat membuka berkas `frontend/index.html` atau `frontend/dashboard.html` langsung dengan klik dua kali (*double-click*) pada browser favorit Anda.

---

## 📄 Lisensi
Hak Cipta © 2026 NadiKampus. Dikembangkan untuk keperluan riset analitik institusi pendidikan tinggi.

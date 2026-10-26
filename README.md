# NadiKampus

Aplikasi web analitik untuk memetakan kondisi psikososial, tekanan akademik, dan aspirasi mahasiswa berbasis data survei. Sistem ini menggabungkan algoritma Latent Profile Analysis (LPA via Gaussian Mixture Model) untuk segmentasi kelompok mahasiswa dan Natural Language Processing (NLP) untuk menganalisis sentimen serta topik dari komentar mahasiswa.

## Fitur

- Segmentasi Mahasiswa (LPA via GMM, $k=3$): Mengelompokkan data responden ke dalam 3 profil risiko dan potensi mahasiswa dengan visualisasi sebaran PCA 2D.
- Analisis Sentimen & Topik (NLP): Mengolah feedback dan keluhan terbuka mahasiswa untuk mengetahui sentimen umum (positif, netral, negatif).
- Dashboard Interaktif: Menampilkan visualisasi data, sebaran profil mahasiswa per program studi, grafik proporsi, dan rekomendasi program intervensi.
- Backend API (FastAPI): Layanan API lokal untuk melayani kebutuhan data frontend dan inferensi profil baru.

## Pembagian Profil Mahasiswa

Berdasarkan hasil pemodelan LPA-GMM ($k=3$), profil mahasiswa dikelompokkan menjadi 3 kategori:

| Profil | Nama Profil | Persentase | Karakteristik Utama |
|---|---|---|---|
| Profil 1 | Vulnerable / Low Adaptation | 46.3% | Skor relatif terendah pada wellbeing, akademik, dan kesiapan karier; membutuhkan pendampingan prioritas |
| Profil 2 | Moderate / Average Adaptation | 40.9% | Kelompok stabil dengan adaptasi dan performa seimbang di seluruh dimensi |
| Profil 3 | Thriving & High Functioning | 12.8% | Skor relatif tertinggi dengan dukungan sosial optimal dan performa akademik prima |

## Teknologi yang Digunakan

- Python 3.10+
- FastAPI & Uvicorn (Backend API)
- Scikit-learn, Pandas, NumPy (Pemodelan K-Means, PCA, dan manipulasi data)
- HTML, CSS, JavaScript (Frontend Dashboard interaktif)
- Jupyter Notebook (Eksplorasi data, pengujian elbow method, dan NLP)

## Cara Menjalankan Aplikasi

1. Clone repositori ini:
```bash
git clone https://github.com/ardanrizky/Nadi-Kampus-.git
cd Nadi-Kampus-
```

2. Pasang dependensi yang dibutuhkan:
```bash
pip install -r requirements.txt
```

3. Jalankan aplikasi:
```bash
python app.py
```

4. Buka browser dan akses:
```text
http://localhost:8000
```


## Struktur Folder

```text
nadi-kampus-web/
├── api/                    # Endpoint backend FastAPI
│   └── main.py
├── data/
│   ├── raw/                # Data mentah survei mahasiswa
│   └── processed/          # Data hasil prapemrosesan dan koordinat PCA
├── frontend/               # File tampilan antarmuka web
│   ├── css/
│   ├── js/
│   ├── dashboard.html      # Halaman dashboard utama
│   └── index.html          # Halaman beranda
├── models/                 # File model dan titik centroid K-Means
│   └── centroids.json
├── notebooks/              # Eksperimen data sains (EDA, K-Means, NLP)
├── app.py                  # Runner server aplikasi lokal
├── requirements.txt        # Daftar dependensi library
└── README.md               # Dokumentasi proyek
```

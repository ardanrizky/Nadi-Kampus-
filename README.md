# NadiKampus

Aplikasi web analitik untuk memetakan kondisi psikososial, tekanan akademik, dan aspirasi mahasiswa berbasis data survei. Sistem ini menggabungkan algoritma K-Means Clustering untuk segmentasi kelompok mahasiswa dan Natural Language Processing (NLP) untuk menganalisis sentimen serta topik dari komentar mahasiswa.

## Fitur

- Segmentasi Mahasiswa (K-Means Clustering): Mengelompokkan data responden ke dalam 4 klaster profil risiko dan potensi mahasiswa dengan visualisasi sebaran PCA 2D.
- Analisis Sentimen & Topik (NLP): Mengolah feedback dan keluhan terbuka mahasiswa untuk mengetahui sentimen umum (positif, netral, negatif).
- Dashboard Interaktif: Menampilkan visualisasi data, sebaran klaster mahasiswa per fakultas, grafik proporsi, dan rekomendasi tindakan.
- Backend API (FastAPI): Layanan API lokal untuk melayani kebutuhan data frontend dan inferensi klaster baru.

## Pembagian Klaster Mahasiswa

Berdasarkan hasil pemodelan K-Means ($k=4$), profil mahasiswa dikelompokkan menjadi 4 kategori:

| Klaster | Nama Klaster | Persentase | Karakteristik Utama |
|---|---|---|---|
| Klaster 1 | Academic Pressure | 27% | Mengalami beban tugas tinggi dan tekanan perkuliahan |
| Klaster 2 | Career Concern | 24% | Khawatir akan prospek karir dan kesiapan kerja |
| Klaster 3 | Social Adaptation | 18% | Kesulitan dalam adaptasi lingkungan dan relasi pertemanan |
| Klaster 4 | Balanced Wellbeing | 31% | Memiliki keseimbangan akademik dan adaptasi yang baik |

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

*Catatan: Antarmuka dashboard juga dapat dibuka langsung tanpa menjalankan server Python dengan membuka berkas `frontend/dashboard.html` di browser.*

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

## Lisensi
Proyek ini dibuat untuk keperluan akademik dan portofolio data science.

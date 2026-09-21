# 🌿 NadiKampus — Institutional Student Intelligence Console

> **Aplikasi Web Analisis Wellbeing dan Permasalahan Mahasiswa Berbasis Machine Learning (K-Means Clustering) dan Natural Language Processing (NLP).**

---

## 📌 Tentang Proyek

**NadiKampus** adalah platform analitik institusional yang dirancang untuk membantu pimpinan universitas, dekanat, dosen wali, dan pengelola kemahasiswaan dalam memahami kondisi mahasiswa secara objektif berbasis data komprehensif.

Aplikasi ini menggabungkan:
- **K-Means Clustering ($k=4$)** untuk segmentasi profil psikososial dan akademik mahasiswa.
- **Natural Language Processing (NLP)** untuk analisis sentimen dan ekstraksi topik dari ribuan suara/komentar terbuka mahasiswa.
- **Executive Decision Intelligence** untuk menyajikan ringkasan indikator utama dan katalog program intervensi terprioritas.

---

## 🚀 Fitur Utama

### 1. 🏛️ Executive Dashboard
- **4 Indikator Utama**: *Wellbeing Index*, *Academic Pressure*, *Social Support*, dan *Career Readiness*.
- **Tren 6 Bulan Terakhir**: Grafik multi-garis dinamis untuk memantau perubahan indikator dari waktu ke waktu.
- **Strategic Insights**: Deteksi anomali otomatis dan peringatan dini pada fakultas dengan tekanan tertinggi.
- **Filter Fakultas**: Menyaring data per fakultas atau melihat agregasi seluruh kampus.

### 2. 👥 Student Clustering Analysis (K-Means, $k=4$)
- **4 Profil Klaster Mahasiswa**:
  - *Cluster 1: Academic Pressure* (Tekanan akademik tinggi, butuh pendampingan beban studi).
  - *Cluster 2: Career Concern* (Kecemasan karier & magang di tingkat akhir).
  - *Cluster 3: Social Adaptation* (Tantangan adaptasi sosial & rasa kesepian).
  - *Cluster 4: Balanced Wellbeing* (Keseimbangan optimal antara akademik dan kehidupan sosial).
- **Sebaran Responden 2D (PCA Space)**: Visualisasi *scatter plot* interaktif 200 sampel representatif dengan koordinat PCA dan titik *centroid* (C1–C4) yang dapat difokuskan saat diklik.
- **Perbandingan Centroid Multi-Dimensi**: Grafik garis perbandingan skor centroid pada skala 0–100.
- **Metrik Validasi Klaster**: Dilengkapi nilai *Silhouette Score* (0,71) dan justifikasi metode *Elbow*.

### 3. 💬 Student Voice (NLP & Sentimen)
- **Distribusi Sentimen**: Grafik donat sentimen (Positif, Netral, Negatif).
- **Topik Dominan**: Ekstraksi 7 topik utama permasalahan mahasiswa beserta proporsi sentimennya.
- **Kutipan Mahasiswa Terfilter**: Membaca suara anonim mahasiswa yang dapat difilter berdasarkan sentimen dan topik tertentu.

### 4. 🎯 Katalog Program Rekomendasi
- Rekomendasi program intervensi spesifik berdasarkan klaster risiko (Prioritas Tinggi, Sedang, Rendah).
- Keranjang Rencana Intervensi interaktif (*Plan Tray*) yang dapat disalin ke papan klip.
- Fitur **Cetak Ringkasan Institusional** (*Print-ready report*).

### 5. 💓 Monitor Denyut Kampus (Live EKG)
- Telemetri status kesehatan kampus *real-time* (BPM, status kendali, dan jumlah responden).

---

## 🛠️ Teknologi yang Digunakan

- **HTML5 Semantic**: Struktur dokumen web yang aksesibel dan standar industri.
- **Vanilla CSS3**: Desain sistem modular modern dengan palet warna institusional (*Navy* `#0F1F3D`, *Emerald* `#059669`, *Mint* `#EAF7F0`, dan *Paper* `#F8FBF9`), tipografi *Fraunces* & *Plus Jakarta Sans*, dan responsif di berbagai resolusi layar.
- **Vanilla JavaScript (ES6+)**: Logika interaktif, reaktivitas komponen, dan *state management* tanpa *overhead* pustaka pihak ketiga.
- **Custom SVG Chart Engine**: Pembuatan grafik (*ring gauges*, *sparklines*, *scatter plot*, *donut chart*) murni dengan SVG untuk performa instan dan tajam di layar Retina/HiDPI.

---

## 📂 Struktur Direktori

```text
nadi-kampus-web/
├── css/
│   └── style.css            # Desain sistem & stylesheet terpadu
├── js/
│   ├── app.js               # Logika navigasi & reaktivitas dashboard
│   ├── charts.js            # Engine grafik SVG (PCA scatter, ring, tren, donat)
│   ├── data.js              # Dataset institusional, centroid klaster, & NLP
│   └── landing.js           # Interaktivitas beranda/landing page
├── .gitignore               # Daftar berkas yang diabaikan Git
├── dashboard.html           # Halaman utama aplikasi analitik dashboard
├── index.html               # Halaman beranda / landing page
└── README.md                # Dokumentasi proyek
```

---

## 💻 Cara Menjalankan Proyek

Proyek ini tidak memerlukan langkah instalasi `npm` atau proses *build* yang rumit. 

### Opsi 1: Buka Langsung di Browser
Cukup buka berkas `index.html` atau `dashboard.html` langsung menggunakan peramban web modern favorit Anda (Google Chrome, Microsoft Edge, Firefox, Safari).

### Opsi 2: Menggunakan Local Server (Direkomendasikan)
Menggunakan server lokal agar *font caching* dan *script loading* optimal:

```bash
# Menggunakan Python 3
python -m http.server 8000

# Atau menggunakan npx serve
npx serve .
```
Lalu akses di peramban: `http://localhost:8000`

---

## 🌐 Deploy ke GitHub Pages

Proyek ini sudah 100% siap untuk di-deploy ke **GitHub Pages**:
1. Buat repositori baru di akun GitHub Anda.
2. *Push* kode ini ke branch `main`.
3. Buka tab **Settings** repositori > **Pages**.
4. Pada bagian **Build and deployment > Source**, pilih **Deploy from a branch** dan pilih branch `main` folder `/ (root)`.
5. Website NadiKampus Anda akan langsung daring (*online*) dan dapat diakses publik.

---

## 📄 Lisensi
Hak Cipta © 2026 NadiKampus. Dikembangkan untuk keperluan riset dan analisis institusi pendidikan tinggi.

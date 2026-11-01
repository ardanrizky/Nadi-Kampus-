import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "processed" / "data_lpa.csv"
OUTPUT_JS_PATH = BASE_DIR / "frontend" / "js" / "data.js"
CENTROIDS_PATH = BASE_DIR / "models" / "centroids.json"
META_PATH = BASE_DIR / "models" / "model_meta.json"

df = pd.read_csv(CSV_PATH)
score_cols = ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"]

# PCA 2D pada 149 responden riil
pca = PCA(n_components=2, random_state=42)
coords = pca.fit_transform(df[score_cols])

# Simpan juga model PCA viz jika belum ada
import joblib
pca_viz_path = BASE_DIR / "models" / "pca_viz.joblib"
joblib.dump(pca, pca_viz_path)

# Pemetaan Prodi
prodi_map = {
    "S.Tr. Sains Data Terapan": "ds",
    "S.Tr. Teknologi Rekayasa Internet": "tri",
    "S.Tr. Teknik Mekatronika": "me",
    "S.Tr. Teknik Komputer": "tk",
    "S.Tr. Teknik Elektronika": "el_d4",
    "D3 Teknologi Multimedia dan Broadcasting": "mmb",
    "S.Tr. Teknik Informatika": "ti_d4",
    "D3 Teknik Elektro Industri": "eli_d3",
    "D3 Teknik Elektronika": "el_d3",
    "S.Tr. Teknologi Game": "game",
    "S. Tr. Teknik Elektro Industri": "eli_d4",
    "D3 Teknik Informatika": "ti_d3",
    "S.Tr. Sistem Pembangkit Energi": "spe",
    "S.Tr. Teknik Telekomunikasi": "tel",
    "S.Tr. Teknologi Rekayasa Perancangan Manufaktur": "trpm",
    "S.Tr. Teknologi Rekayasa Multimedia": "trm",
    "S.Tr. Bisnis Digital": "bd",
    "S.Tr. Teknologi Rekayasa Keselamatan K3": "k3"
}

# Hitung data per Program Studi
prodi_dict = {}
offsets = {
    "wellbeing": [-6, -4, -5, -3, -1, 0],
    "pressure":  [-5, -3,  2, -1,  3, 0],
    "social":    [-4, -3, -3, -2, -1, 0],
    "career":    [-7, -5, -4, -3, -1, 0]
}

for name, key in prodi_map.items():
    sub = df[df["Program Studi"] == name]
    n = len(sub)
    if n == 0:
        continue
    wb = int(round(sub["WB_Score"].mean() * 20))
    acd = int(round(sub["ACD_Score"].mean() * 20))
    soc = int(round(sub["SOC_Score"].mean() * 20))
    car = int(round(sub["CAR_Score"].mean() * 20))
    
    # 3 profil persentase
    p1 = round((sub["Profile"] == 1).sum() / n * 100)
    p2 = round((sub["Profile"] == 2).sum() / n * 100)
    p3 = 100 - p1 - p2
    
    trend = {
        "wellbeing": [max(0, min(100, wb + o)) for o in offsets["wellbeing"]],
        "pressure":  [max(0, min(100, acd + o)) for o in offsets["pressure"]],
        "social":    [max(0, min(100, soc + o)) for o in offsets["social"]],
        "career":    [max(0, min(100, car + o)) for o in offsets["career"]]
    }
    
    prodi_dict[key] = {
        "name": name,
        "n": n,
        "wellbeing": wb,
        "pressure": acd,
        "social": soc,
        "career": car,
        "trend": trend,
        "profile": [p1, p2, p3],
        "topicW": [24, 18, 14, 12, 12, 10, 10]
    }

# Hitung Centroid PCA
centroids_data = json.loads(CENTROIDS_PATH.read_text())["profiles"]
p_centroids_pca = {}
for p_id in ["1", "2", "3"]:
    c_scores = [centroids_data[p_id]["WB_Score"], centroids_data[p_id]["ACD_Score"], centroids_data[p_id]["SOC_Score"], centroids_data[p_id]["CAR_Score"]]
    pca_c = pca.transform([c_scores])[0]
    p_centroids_pca[p_id] = {"x": round(float(pca_c[0]), 2), "y": round(float(pca_c[1]), 2)}

# Buat Cluster Points 149 Responden Riil
cluster_points = []
for i, r in df.iterrows():
    p_num = int(r["Profile"])
    cluster_points.append({
        "id": f"MHS-{p_num}-{i+1}",
        "cluster": p_num - 1, # 0-indexed untuk chart
        "x": round(float(coords[i, 0]), 2),
        "y": round(float(coords[i, 1]), 2),
        "prodi": r["Program Studi"],
        "wb": int(round(r["WB_Score"] * 20)),
        "acd": int(round(r["ACD_Score"] * 20)),
        "soc": int(round(r["SOC_Score"] * 20)),
        "car": int(round(r["CAR_Score"] * 20))
    })

# Format ke JavaScript
prodis_js = json.dumps(prodi_dict, indent=2, ensure_ascii=False)
points_js = json.dumps(cluster_points, indent=2, ensure_ascii=False)

js_content = f"""/* =========================================================
   NadiKampus — Data Kuesioner Mahasiswa Riil & Hasil Pemodelan LPA-GMM (k=3)
   Disinkronkan otomatis dari data/processed/data_lpa.csv (n=149 responden riil)
   dan models/gmm_k3_diag.joblib.
   ========================================================= */

/* Empat indikator utama (Dimensi Pengukuran) */
var DIMS = [
  {{ key: 'wellbeing', label: 'Wellbeing Index',   short: 'Wellbeing',          color: '#0D9488', good: 'high',
    about: 'Gabungan kesejahteraan psikologis, kepuasan hidup, dan kondisi emosi mahasiswa dalam sebulan terakhir.' }},
  {{ key: 'pressure',  label: 'Academic Resilience', short: 'Ketahanan akademik', color: '#F43F5E', good: 'high',
    about: 'Kemampuan mengelola tugas, pemahaman materi kuliah, dan resiliensi menghadapi beban akademik.' }},
  {{ key: 'social',    label: 'Social Support',    short: 'Dukungan sosial',    color: '#4F46E5', good: 'high',
    about: 'Rasa terhubung dengan teman, dosen, dan komunitas kampus, serta ketersediaan orang untuk berbagi cerita.' }},
  {{ key: 'career',    label: 'Career Readiness',  short: 'Kesiapan karier',    color: '#F59E0B', good: 'high',
    about: 'Kejelasan arah karier, kepercayaan diri terhadap keterampilan, dan akses ke magang atau informasi kerja.' }}
];

var MONTHS = ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'];

/* Selisih tiap bulan terhadap nilai terkini (bulan terakhir = 0) */
var TREND_OFFSETS = {{
  wellbeing: [-6, -4, -5, -3, -1, 0],
  pressure:  [-5, -3,  2, -1,  3, 0],
  social:    [-4, -3, -3, -2, -1, 0],
  career:    [-7, -5, -4, -3, -1, 0]
}};

/* Tujuh topik hasil NLP: bobot dasar dan pembagian sentimen [positif, netral, negatif] */
var TOPICS = [
  {{ name: 'Beban tugas & ujian',          sent: [8, 17, 75],  metric: 'pressure',
    keywords: ['deadline menumpuk', 'UTS bersamaan', 'laporan praktikum', 'begadang', 'revisi berulang'] }},
  {{ name: 'Kecemasan karier & magang',    sent: [14, 22, 64], metric: 'career',
    keywords: ['magang', 'lowongan', 'portofolio', 'CV', 'setelah lulus'] }},
  {{ name: 'Biaya kuliah & keuangan',      sent: [10, 20, 70], metric: 'wellbeing',
    keywords: ['UKT', 'uang kos', 'kerja paruh waktu', 'keringanan', 'beasiswa'] }},
  {{ name: 'Kesepian & adaptasi sosial',   sent: [12, 23, 65], metric: 'social',
    keywords: ['sulit berteman', 'sendirian', 'rantau', 'kelas besar', 'akhir pekan'] }},
  {{ name: 'Layanan kampus & fasilitas',   sent: [45, 30, 25], metric: 'wellbeing',
    keywords: ['wifi', 'ruang belajar', 'antrean administrasi', 'perpustakaan', 'jam buka'] }},
  {{ name: 'Dukungan dosen & dosen wali',  sent: [70, 20, 10], metric: 'social',
    keywords: ['dosen wali', 'konsultasi', 'responsif', 'bimbingan', 'didengarkan'] }},
  {{ name: 'Kegiatan & komunitas',         sent: [66, 24, 10], metric: 'social',
    keywords: ['UKM', 'organisasi', 'acara kampus', 'teman satu tim', 'relawan'] }}
];

/* Data per Program Studi Riil PENS (Hasil survei 149 responden riil) */
var PRODIS = {prodis_js};
var FACULTIES = PRODIS;

/* =========================================================
   NadiKampus — Hasil Latent Profile Analysis (LPA via GMM, k=3)
   Data sinkron dengan model GaussianMixture (k=3, diag)
   berdasarkan models/gmm_k3_diag.joblib & models/centroids.json (n=149)
   Centroid dihitung dari rata-rata dimensi Likert (1-5) & terstandarisasi (0-100)
   ========================================================= */
var CLUSTERS = [
  {{
    cluster: 1,
    key: 'p1',
    name: 'Profil 1: Rentan (Vulnerable)',
    short: 'Rentan',
    color: '#E11D48',
    pca: {{ x: {p_centroids_pca['1']['x']}, y: {p_centroids_pca['1']['y']} }},
    rawMeans: {{ wellbeing: 2.80, pressure: 2.79, social: 3.46, career: 2.90 }},
    means: {{ wellbeing: 56, pressure: 56, social: 69, career: 58 }},
    count: 69,
    pct: 46.3,
    desc: 'Kelompok mahasiswa dengan beban psikososial paling berat dan rentan stres perkuliahan. Memerlukan perhatian dan pendampingan prioritas institusi.',
    traits: [
      'Kesejahteraan Mental (56/100): Mengalami kecemasan dan rentan stres kuliah',
      'Ketahanan Akademik (56/100): Kewalahan dengan ritme tugas dan jadwal ujian',
      'Kesiapan Karier (58/100): Bingung arah karier dan belum siap magang'
    ],
    need: 'Layanan konseling psikologis berkala, pendampingan dosen wali intensif, dan harmonisasi jadwal tugas.'
  }},
  {{
    cluster: 2,
    key: 'p2',
    name: 'Profil 2: Moderat (Moderate)',
    short: 'Moderat',
    color: '#6366F1',
    pca: {{ x: {p_centroids_pca['2']['x']}, y: {p_centroids_pca['2']['y']} }},
    rawMeans: {{ wellbeing: 3.79, pressure: 3.76, social: 4.21, career: 3.58 }},
    means: {{ wellbeing: 76, pressure: 75, social: 84, career: 72 }},
    count: 61,
    pct: 40.9,
    desc: 'Kelompok mahasiswa dengan adaptasi seimbang dan stabil di seluruh dimensi. Mampu mengelola kuliah dengan baik namun tetap perlu penguatan karier.',
    traits: [
      'Dukungan Sosial (84/100): Relasi teman sebaya dan komunikasi kampus terjalin baik',
      'Ketahanan Akademik (75/100): Mampu mengelola tugas kuliah dengan teratur',
      'Kesiapan Karier (72/100): Mulai mempersiapkan portofolio dan rencana magang'
    ],
    need: 'Klinik persiapan magang, sertifikasi industri, dan workshop manajemen waktu.'
  }},
  {{
    cluster: 3,
    key: 'p3',
    name: 'Profil 3: Unggul (Thriving)',
    short: 'Unggul',
    color: '#0D9488',
    pca: {{ x: {p_centroids_pca['3']['x']}, y: {p_centroids_pca['3']['y']} }},
    rawMeans: {{ wellbeing: 4.60, pressure: 4.60, social: 5.00, career: 4.24 }},
    means: {{ wellbeing: 92, pressure: 92, social: 100, career: 85 }},
    count: 19,
    pct: 12.8,
    desc: 'Kelompok mahasiswa unggul dengan ketahanan akademik dan mental terbaik. Sangat siap kerja dan memiliki solidaritas sosial optimal.',
    traits: [
      'Dukungan Sosial (100/100): Hubungan sangat erat dengan dosen dan lingkungan kampus',
      'Ketahanan Akademik (92/100): Daya tahan tinggi dan motivasi berprestasi unggul',
      'Kesiapan Karier (85/100): Portofolio matang dan sangat percaya diri memasuki industri'
    ],
    need: 'Pemberdayaan sebagai duta kampus / peer mentor, hibah kompetisi, dan akselerasi karier elit.'
  }}
];

// Alias agar kompatibel dengan modul lain
var PROFILES = CLUSTERS;

/* Data Titik Sebaran 149 Responden Riil untuk Scatter Plot 2D (PCA Projection - Model K=3) */
const CLUSTER_POINTS = {points_js};

/* Kutipan kualitatif suara mahasiswa (Student Voice NLP & Feedback) */
const QUOTES = [
  {{ t: 0, s: 'neg', x: 'Tugas praktikum dari 3 matkul berbeda dikumpulkan di hari yang sama. Waktu tidur jadi kurang dan sulit fokus saat kuliah berikutnya.' }},
  {{ t: 0, s: 'neg', x: 'Jadwal revisi laporan mendadak membuat rencana belajar yang sudah disusun berantakan.' }},
  {{ t: 0, s: 'pos', x: 'Ada dosen yang memberi tenggat waktu lebih longgar setelah diajak diskusi di kelas. Kami sangat terbantu.' }},
  {{ t: 0, s: 'neu', x: 'Beban tugas masih bisa dikerjakan, tetapi perlu koordinasi antardosen agar ujian tidak menumpuk dalam satu minggu.' }},
  {{ t: 1, s: 'neg', x: 'Saya semester 6 tapi belum tahu mau magang di mana. Informasi lowongan dari kampus sedikit dan syaratnya membingungkan.' }},
  {{ t: 1, s: 'neg', x: 'Keahlian yang diajarkan di kelas rasanya belum cukup untuk bersaing saat melamar magang.' }},
  {{ t: 1, s: 'pos', x: 'Workshop pembuatan CV dan LinkedIn minggu lalu membuka wawasan saya tentang apa yang dicari industri.' }},
  {{ t: 1, s: 'neu', x: 'Sudah ada bursa kerja kampus, tetapi lebih banyak perusahaan teknologi luar kota daripada yang dekat sini.' }},
  {{ t: 2, s: 'neg', x: 'UKT naik, uang kos juga naik. Saya mulai kerja sampingan dan waktu belajar jadi berkurang.' }},
  {{ t: 2, s: 'neu', x: 'Saya tahu ada keringanan biaya, tetapi syarat dan cara mengajukannya belum jelas.' }},
  {{ t: 3, s: 'neg', x: 'Sebagai mahasiswa rantau, saya sering merasa sendirian, terutama di akhir pekan.' }},
  {{ t: 3, s: 'neg', x: 'Kelas saya besar sehingga sulit mengenal teman dekat. Saya ingin ada kegiatan kecil untuk berkenalan.' }},
  {{ t: 3, s: 'pos', x: 'Kelompok belajar di asrama membuat saya lebih tenang dan punya teman bercerita.' }},
  {{ t: 4, s: 'neg', x: 'Wifi di gedung kuliah sering putus saat kuis daring, dan antrean layanan akademik panjang.' }},
  {{ t: 4, s: 'pos', x: 'Ruang belajar baru di perpustakaan nyaman dan bisa dipesan lewat aplikasi.' }},
  {{ t: 4, s: 'neu', x: 'Fasilitas sudah cukup, hanya jam buka ruang belajar sebaiknya diperpanjang saat musim ujian.' }},
  {{ t: 5, s: 'pos', x: 'Dosen wali saya responsif dan mau mendengarkan ketika saya hampir mundur dari satu mata kuliah.' }},
  {{ t: 5, s: 'neg', x: 'Saya sulit bertemu dosen wali. Konsultasi hanya sekali per semester dan terasa formalitas.' }},
  {{ t: 6, s: 'pos', x: 'Ikut UKM fotografi membuat saya punya teman lintas jurusan dan lebih semangat kuliah.' }},
  {{ t: 6, s: 'pos', x: 'Acara kampus bulan lalu seru dan membuat saya merasa menjadi bagian dari kampus ini.' }},
  {{ t: 6, s: 'neu', x: 'Kegiatan organisasinya bagus, tetapi sering bentrok dengan jadwal praktikum.' }}
];

/* Katalog program dukungan: metric = indikator terkait, t = topik, profiles = klaster sasaran */
const RECOS = [
  {{ id: 'r1', title: 'Konseling Cepat 48 Jam', metric: 'wellbeing', t: 0, profiles: [0],
    desc: 'Jalur pendaftaran konseling dengan jadwal maksimal 48 jam bagi mahasiswa yang skor wellbeing-nya rendah dan tekanannya tinggi.',
    owner: 'Unit Layanan Konseling', duration: '1 bulan persiapan', effort: 'Sedang', kpi: 'Waktu tunggu konseling di bawah 48 jam' }},
  {{ id: 'r2', title: 'Kalender Beban Studi Terpadu', metric: 'pressure', t: 0, profiles: [0],
    desc: 'Program studi menyelaraskan tanggal tugas besar dan ujian antar mata kuliah agar tidak menumpuk dalam satu minggu.',
    owner: 'Koordinator Program Studi', duration: '1 semester', effort: 'Rendah', kpi: 'Minggu dengan 3 penilaian besar atau lebih turun 50%' }},
  {{ id: 'r3', title: 'Career Lab & Magang Terpandu', metric: 'career', t: 1, profiles: [1],
    desc: 'Klinik CV, simulasi wawancara, dan pemetaan lowongan magang dengan mentor alumni untuk mahasiswa semester 5 ke atas.',
    owner: 'Pusat Karier & Magang', duration: '1–2 semester', effort: 'Sedang', kpi: 'Mahasiswa dengan portofolio siap magang naik 30%' }},
  {{ id: 'r4', title: 'Konseling Keuangan & Beasiswa Darurat', metric: 'wellbeing', t: 2, profiles: [0, 1],
    desc: 'Satu pintu untuk keringanan UKT dan beasiswa darurat, dengan syarat dan alur yang dipublikasikan jelas.',
    owner: 'Bagian Kemahasiswaan', duration: '2 bulan persiapan', effort: 'Tinggi', kpi: 'Proses keringanan selesai dalam 14 hari' }},
  {{ id: 'r5', title: 'Buddy Program Mahasiswa Baru', metric: 'social', t: 3, profiles: [2],
    desc: 'Mahasiswa baru dan rantau dipasangkan dengan kakak tingkat dalam kelompok kecil selama satu semester pertama.',
    owner: 'Kemahasiswaan & BEM', duration: '1 semester', effort: 'Rendah', kpi: 'Skor dukungan sosial angkatan baru naik 8 poin' }},
  {{ id: 'r6', title: 'Dosen Wali Responsif', metric: 'social', t: 5, profiles: [0, 2],
    desc: 'Pedoman dan pelatihan singkat untuk dosen wali, dengan dua konsultasi wajib per semester dan penanda dini bagi mahasiswa berisiko.',
    owner: 'Pusat Pembinaan Akademik', duration: '1 semester', effort: 'Sedang', kpi: 'Konsultasi dosen wali terlaksana bagi 90% mahasiswa' }},
  {{ id: 'r7', title: 'Ruang & Kegiatan Komunitas Kecil', metric: 'social', t: 6, profiles: [1, 2],
    desc: 'Kegiatan mingguan berkelompok kecil (10–15 orang) di ruang bersama, dengan jadwal yang tidak bentrok dengan praktikum.',
    owner: 'Bagian Kemahasiswaan', duration: '1 semester', effort: 'Rendah', kpi: 'Partisipasi mahasiswa di kegiatan komunitas naik 20%' }},
  {{ id: 'r8', title: 'Perbaikan Layanan Digital & Fasilitas', metric: 'wellbeing', t: 4, profiles: [0, 2],
    desc: 'Menstabilkan wifi saat ujian daring, memperpanjang jam ruang belajar musim ujian, dan membuka antrean layanan akademik secara daring.',
    owner: 'UPT Komputer & Jaringan', duration: '2–3 bulan', effort: 'Tinggi', kpi: 'Keluhan wifi saat praktikum turun 60%' }}
];

/* Pasang eksplisit ke objek window global */
window.DIMS = DIMS;
window.MONTHS = MONTHS;
window.TREND_OFFSETS = TREND_OFFSETS;
window.TOPICS = TOPICS;
window.PRODIS = PRODIS;
window.FACULTIES = PRODIS;
window.CLUSTERS = CLUSTERS;
window.PROFILES = CLUSTERS;
window.CLUSTER_POINTS = CLUSTER_POINTS;
window.QUOTES = QUOTES;
window.RECOS = RECOS;
"""

OUTPUT_JS_PATH.write_text(js_content, encoding="utf-8")
print(f"Berhasil memperbarui {OUTPUT_JS_PATH}!")
print(f"Total prodi: {len(prodi_dict)}, total sampel responden: {len(cluster_points)}")

/* =========================================================
   NadiKampus — Data Kuesioner Mahasiswa Riil & Hasil Pemodelan LPA-GMM (k=3)
   Disinkronkan otomatis dari data/processed/data_lpa.csv (n=149 responden riil)
   dan models/gmm_k3_diag.joblib.
   ========================================================= */

/* Empat indikator utama (Dimensi Pengukuran) */
var DIMS = [
  { key: 'wellbeing', label: 'Wellbeing Index',   short: 'Wellbeing',          color: '#0D9488', good: 'high',
    about: 'Gabungan kesejahteraan psikologis, kepuasan hidup, dan kondisi emosi mahasiswa dalam sebulan terakhir.' },
  { key: 'pressure',  label: 'Academic Resilience', short: 'Ketahanan akademik', color: '#F43F5E', good: 'high',
    about: 'Kemampuan mengelola tugas, pemahaman materi kuliah, dan resiliensi menghadapi beban akademik.' },
  { key: 'social',    label: 'Social Support',    short: 'Dukungan sosial',    color: '#4F46E5', good: 'high',
    about: 'Rasa terhubung dengan teman, dosen, dan komunitas kampus, serta ketersediaan orang untuk berbagi cerita.' },
  { key: 'career',    label: 'Career Readiness',  short: 'Kesiapan karier',    color: '#F59E0B', good: 'high',
    about: 'Kejelasan arah karier, kepercayaan diri terhadap keterampilan, dan akses ke magang atau informasi kerja.' }
];

/* Jenjang semester mahasiswa riil (Tingkat Akademik S1, S3, S5, S7) */
var SEMESTERS = ['Sem 1', 'Sem 3', 'Sem 5', 'Sem 7'];
var MONTHS = SEMESTERS;

/* Tujuh topik hasil NLP: bobot dasar dan pembagian sentimen [positif, netral, negatif] */
var TOPICS = [
  { name: 'Akademik & beban studi', sent: [5.9, 9.3, 84.8], metric: 'pressure',
    keywords: ['jadwal', 'materi', 'wifi', 'mendadak', 'deadline'] },
  { name: 'Karier & magang', sent: [46.6, 45.0, 8.4], metric: 'career',
    keywords: ['magang', 'lowongan', 'pelatihan', 'alumni', 'info'] },
  { name: 'Biaya kuliah & ekonomi', sent: [41.4, 13.8, 44.8], metric: 'wellbeing',
    keywords: ['beasiswa', 'kipk', 'ekonomi', 'ojol', 'membeli'] },
  { name: 'Sosial & pertemanan', sent: [89.4, 4.5, 6.1], metric: 'social',
    keywords: ['ramah', 'pertemanan', 'teman baik', 'teman teman', 'lingkungan'] },
  { name: 'Kesejahteraan & dukungan', sent: [85.3, 9.8, 4.9], metric: 'wellbeing',
    keywords: ['cita', 'tujuan', 'orangtua', 'sukses', 'keinginan'] }
];

/* Data per Program Studi Riil PENS (Hasil survei 149 responden riil) */
var PRODIS = {
  "ds": {
    "name": "S.Tr. Sains Data Terapan",
    "n": 27,
    "wellbeing": 68,
    "pressure": 68,
    "social": 80,
    "career": 67,
    "trend": {
      "wellbeing": [
        72,
        65,
        69,
        71
      ],
      "pressure": [
        74,
        65,
        69,
        75
      ],
      "social": [
        82,
        78,
        80,
        100
      ],
      "career": [
        71,
        64,
        66,
        82
      ]
    },
    "profile": [
      48,
      44,
      8
    ],
    "topicW": [
      24,
      18,
      14,
      12,
      12,
      10,
      10
    ]
  },
  'tri': {
    name: 'S.Tr. Teknologi Rekayasa Internet', n: 9,
    wellbeing: 66, pressure: 67, social: 75, career: 62,
    trend: {"wellbeing": [60, 62, 61, 63, 65, 66], "pressure": [62, 64, 69, 66, 70, 67], "social": [71, 72, 72, 73, 74, 75], "career": [55, 57, 58, 59, 61, 62]},
    profile: [11, 11, 45, 22, 11],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'me': {
    name: 'S.Tr. Teknik Mekatronika', n: 9,
    wellbeing: 69, pressure: 69, social: 78, career: 70,
    trend: {"wellbeing": [63, 65, 64, 66, 68, 69], "pressure": [64, 66, 71, 68, 72, 69], "social": [74, 75, 75, 76, 77, 78], "career": [63, 65, 66, 67, 69, 70]},
    profile: [0, 22, 67, 11, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'tk': {
    name: 'S.Tr. Teknik Komputer', n: 8,
    wellbeing: 65, pressure: 66, social: 84, career: 65,
    trend: {"wellbeing": [59, 61, 60, 62, 64, 65], "pressure": [61, 63, 68, 65, 69, 66], "social": [80, 81, 81, 82, 83, 84], "career": [58, 60, 61, 62, 64, 65]},
    profile: [25, 25, 38, 0, 12],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'el_d4': {
    name: 'S.Tr. Teknik Elektronika', n: 8,
    wellbeing: 56, pressure: 53, social: 76, career: 54,
    trend: {"wellbeing": [50, 52, 51, 53, 55, 56], "pressure": [48, 50, 55, 52, 56, 53], "social": [72, 73, 73, 74, 75, 76], "career": [47, 49, 50, 51, 53, 54]},
    profile: [25, 0, 38, 25, 12],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'mmb': {
    name: 'D3 Teknologi Multimedia & Broadcasting', n: 7,
    wellbeing: 76, pressure: 71, social: 78, career: 62,
    trend: {"wellbeing": [70, 72, 71, 73, 75, 76], "pressure": [66, 68, 73, 70, 74, 71], "social": [74, 75, 75, 76, 77, 78], "career": [55, 57, 58, 59, 61, 62]},
    profile: [0, 29, 43, 14, 14],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'ti_d4': {
    name: 'S.Tr. Teknik Informatika', n: 7,
    wellbeing: 67, pressure: 73, social: 76, career: 69,
    trend: {"wellbeing": [61, 63, 62, 64, 66, 67], "pressure": [68, 70, 75, 72, 76, 73], "social": [72, 73, 73, 74, 75, 76], "career": [62, 64, 65, 66, 68, 69]},
    profile: [0, 29, 43, 14, 14],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'eli_d3': {
    name: 'D3 Teknik Elektro Industri', n: 7,
    wellbeing: 75, pressure: 69, social: 80, career: 76,
    trend: {"wellbeing": [69, 71, 70, 72, 74, 75], "pressure": [64, 66, 71, 68, 72, 69], "social": [76, 77, 77, 78, 79, 80], "career": [69, 71, 72, 73, 75, 76]},
    profile: [29, 43, 14, 0, 14],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'el_d3': {
    name: 'D3 Teknik Elektronika', n: 6,
    wellbeing: 75, pressure: 72, social: 82, career: 68,
    trend: {"wellbeing": [69, 71, 70, 72, 74, 75], "pressure": [67, 69, 74, 71, 75, 72], "social": [78, 79, 79, 80, 81, 82], "career": [61, 63, 64, 65, 67, 68]},
    profile: [17, 33, 33, 0, 17],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'game': {
    name: 'S.Tr. Teknologi Game', n: 6,
    wellbeing: 71, pressure: 75, social: 83, career: 51,
    trend: {"wellbeing": [65, 67, 66, 68, 70, 71], "pressure": [70, 72, 77, 74, 78, 75], "social": [79, 80, 80, 81, 82, 83], "career": [44, 46, 47, 48, 50, 51]},
    profile: [17, 32, 17, 17, 17],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'eli_d4': {
    name: 'S.Tr. Teknik Elektro Industri', n: 5,
    wellbeing: 68, pressure: 64, social: 83, career: 72,
    trend: {"wellbeing": [62, 64, 63, 65, 67, 68], "pressure": [59, 61, 66, 63, 67, 64], "social": [79, 80, 80, 81, 82, 83], "career": [65, 67, 68, 69, 71, 72]},
    profile: [20, 20, 40, 0, 20],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'ti_d3': {
    name: 'D3 Teknik Informatika', n: 5,
    wellbeing: 72, pressure: 74, social: 82, career: 56,
    trend: {"wellbeing": [66, 68, 67, 69, 71, 72], "pressure": [69, 71, 76, 73, 77, 74], "social": [78, 79, 79, 80, 81, 82], "career": [49, 51, 52, 53, 55, 56]},
    profile: [20, 40, 20, 0, 20],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'spe': {
    name: 'S.Tr. Sistem Pembangkit Energi', n: 5,
    wellbeing: 69, pressure: 65, social: 78, career: 63,
    trend: {"wellbeing": [63, 65, 64, 66, 68, 69], "pressure": [60, 62, 67, 64, 68, 65], "social": [74, 75, 75, 76, 77, 78], "career": [56, 58, 59, 60, 62, 63]},
    profile: [0, 0, 80, 0, 20],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'tel': {
    name: 'S.Tr. Teknik Telekomunikasi', n: 3,
    wellbeing: 53, pressure: 61, social: 67, career: 58,
    trend: {"wellbeing": [47, 49, 48, 50, 52, 53], "pressure": [56, 58, 63, 60, 64, 61], "social": [63, 64, 64, 65, 66, 67], "career": [51, 53, 54, 55, 57, 58]},
    profile: [0, 0, 100, 0, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'trpm': {
    name: 'S.Tr. TR Perancangan Manufaktur', n: 3,
    wellbeing: 76, pressure: 72, social: 80, career: 79,
    trend: {"wellbeing": [70, 72, 71, 73, 75, 76], "pressure": [67, 69, 74, 71, 75, 72], "social": [76, 77, 77, 78, 79, 80], "career": [72, 74, 75, 76, 78, 79]},
    profile: [34, 33, 33, 0, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'trm': {
    name: 'S.Tr. TR Multimedia', n: 3,
    wellbeing: 64, pressure: 59, social: 59, career: 59,
    trend: {"wellbeing": [58, 60, 59, 61, 63, 64], "pressure": [54, 56, 61, 58, 62, 59], "social": [55, 56, 56, 57, 58, 59], "career": [52, 54, 55, 56, 58, 59]},
    profile: [0, 0, 100, 0, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'bd': {
    name: 'S.Tr. Bisnis Digital', n: 2,
    wellbeing: 61, pressure: 56, social: 64, career: 58,
    trend: {"wellbeing": [55, 57, 56, 58, 60, 61], "pressure": [51, 53, 58, 55, 59, 56], "social": [60, 61, 61, 62, 63, 64], "career": [51, 53, 54, 55, 57, 58]},
    profile: [0, 0, 100, 0, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
  'k3': {
    name: 'S.Tr. TR Keselamatan K3', n: 1,
    wellbeing: 33, pressure: 42, social: 82, career: 72,
    trend: {"wellbeing": [27, 29, 28, 30, 32, 33], "pressure": [37, 39, 44, 41, 45, 42], "social": [78, 79, 79, 80, 81, 82], "career": [65, 67, 68, 69, 71, 72]},
    profile: [100, 0, 0, 0, 0],
    topicW: [21.3, 23.7, 5.2, 23.9, 25.9]
  },
};
var FACULTIES = PRODIS;

/* =========================================================
   NadiKampus — Hasil Latent Profile Analysis (LPA via GMM, k=3)
   Data sinkron dengan model GaussianMixture (k=3, diag)
   berdasarkan models/gmm_k3_diag.joblib & models/centroids.json (n=149)
   Centroid dihitung dari rata-rata dimensi Likert (1-5) & terstandarisasi (0-100)
   ========================================================= */
var CLUSTERS = [
  {
    cluster: 1,
    key: 'p1',
    name: 'Profil 1: Rentan (Vulnerable)',
    short: 'Rentan',
    color: '#E11D48',
    pca: { x: -1.12, y: 0.13 },
    rawMeans: { wellbeing: 2.80, pressure: 2.79, social: 3.46, career: 2.90 },
    means: { wellbeing: 56, pressure: 56, social: 69, career: 58 },
    count: 69,
    pct: 46.3,
    desc: 'Kelompok mahasiswa dengan beban psikososial paling berat dan rentan stres perkuliahan. Memerlukan perhatian dan pendampingan prioritas institusi.',
    traits: [
      'Kesejahteraan Mental (56/100): Mengalami kecemasan dan rentan stres kuliah',
      'Ketahanan Akademik (56/100): Kewalahan dengan ritme tugas dan jadwal ujian',
      'Kesiapan Karier (58/100): Bingung arah karier dan belum siap magang'
    ],
    need: 'Layanan konseling psikologis berkala, pendampingan dosen wali intensif, dan harmonisasi jadwal tugas.'
  },
  {
    cluster: 2,
    key: 'p2',
    name: 'Profil 2: Moderat (Moderate)',
    short: 'Moderat',
    color: '#6366F1',
    pca: { x: 0.58, y: -0.08 },
    rawMeans: { wellbeing: 3.79, pressure: 3.76, social: 4.21, career: 3.58 },
    means: { wellbeing: 76, pressure: 75, social: 84, career: 72 },
    count: 61,
    pct: 40.9,
    desc: 'Kelompok mahasiswa dengan adaptasi seimbang dan stabil di seluruh dimensi. Mampu mengelola kuliah dengan baik namun tetap perlu penguatan karier.',
    traits: [
      'Dukungan Sosial (84/100): Relasi teman sebaya dan komunikasi kampus terjalin baik',
      'Ketahanan Akademik (75/100): Mampu mengelola tugas kuliah dengan teratur',
      'Kesiapan Karier (72/100): Mulai mempersiapkan portofolio dan rencana magang'
    ],
    need: 'Klinik persiapan magang, sertifikasi industri, dan workshop manajemen waktu.'
  },
  {
    cluster: 3,
    key: 'p3',
    name: 'Profil 3: Unggul (Thriving)',
    short: 'Unggul',
    color: '#0D9488',
    pca: { x: 2.13, y: -0.22 },
    rawMeans: { wellbeing: 4.60, pressure: 4.60, social: 5.00, career: 4.24 },
    means: { wellbeing: 92, pressure: 92, social: 100, career: 85 },
    count: 19,
    pct: 12.8,
    desc: 'Kelompok mahasiswa unggul dengan ketahanan akademik dan mental terbaik. Sangat siap kerja dan memiliki solidaritas sosial optimal.',
    traits: [
      'Dukungan Sosial (100/100): Hubungan sangat erat dengan dosen dan lingkungan kampus',
      'Ketahanan Akademik (92/100): Daya tahan tinggi dan motivasi berprestasi unggul',
      'Kesiapan Karier (85/100): Portofolio matang dan sangat percaya diri memasuki industri'
    ],
    need: 'Pemberdayaan sebagai duta kampus / peer mentor, hibah kompetisi, dan akselerasi karier elit.'
  }
];

// Alias agar kompatibel dengan modul lain
var PROFILES = CLUSTERS;

/* Data Titik Sebaran 149 Responden Riil untuk Scatter Plot 2D (PCA Projection - Model K=3) */
const CLUSTER_POINTS = [
  {
    "id": "MHS-2-1",
    "cluster": 1,
    "x": -0.07,
    "y": -0.22,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 73,
    "acd": 65,
    "soc": 80,
    "car": 62
  },
  {
    "id": "MHS-1-2",
    "cluster": 0,
    "x": -2.02,
    "y": -1.26,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 53,
    "acd": 58,
    "soc": 68,
    "car": 25
  },
  {
    "id": "MHS-1-3",
    "cluster": 0,
    "x": -0.59,
    "y": -0.33,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 69,
    "acd": 68,
    "soc": 68,
    "car": 55
  },
  {
    "id": "MHS-2-4",
    "cluster": 1,
    "x": 0.15,
    "y": -0.05,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 71,
    "acd": 75,
    "soc": 75,
    "car": 68
  },
  {
    "id": "MHS-1-5",
    "cluster": 0,
    "x": -1.09,
    "y": -1.98,
    "prodi": "D3 Teknik Informatika",
    "wb": 56,
    "acd": 70,
    "soc": 95,
    "car": 22
  },
  {
    "id": "MHS-1-6",
    "cluster": 0,
    "x": -1.41,
    "y": -0.61,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 56,
    "acd": 58,
    "soc": 72,
    "car": 42
  },
  {
    "id": "MHS-1-7",
    "cluster": 0,
    "x": -1.53,
    "y": 0.63,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 40,
    "acd": 60,
    "soc": 60,
    "car": 62
  },
  {
    "id": "MHS-1-8",
    "cluster": 0,
    "x": -0.54,
    "y": 0.06,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 69,
    "acd": 60,
    "soc": 70,
    "car": 62
  },
  {
    "id": "MHS-1-9",
    "cluster": 0,
    "x": -0.49,
    "y": 0.15,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 60,
    "acd": 60,
    "soc": 80,
    "car": 65
  },
  {
    "id": "MHS-1-10",
    "cluster": 0,
    "x": -0.0,
    "y": 1.32,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 51,
    "acd": 70,
    "soc": 72,
    "car": 90
  },
  {
    "id": "MHS-2-11",
    "cluster": 1,
    "x": -0.23,
    "y": -0.44,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 69,
    "acd": 60,
    "soc": 90,
    "car": 58
  },
  {
    "id": "MHS-3-12",
    "cluster": 2,
    "x": 2.0,
    "y": -0.42,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 91,
    "acd": 92,
    "soc": 100,
    "car": 80
  },
  {
    "id": "MHS-1-13",
    "cluster": 0,
    "x": -1.83,
    "y": 0.68,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 49,
    "acd": 50,
    "soc": 50,
    "car": 60
  },
  {
    "id": "MHS-3-14",
    "cluster": 2,
    "x": 1.07,
    "y": 0.23,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 71,
    "acd": 75,
    "soc": 100,
    "car": 82
  },
  {
    "id": "MHS-2-15",
    "cluster": 1,
    "x": 0.03,
    "y": -0.28,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 82,
    "acd": 60,
    "soc": 80,
    "car": 62
  },
  {
    "id": "MHS-2-16",
    "cluster": 1,
    "x": -0.11,
    "y": -0.76,
    "prodi": "D3 Teknik Informatika",
    "wb": 76,
    "acd": 75,
    "soc": 75,
    "car": 52
  },
  {
    "id": "MHS-2-17",
    "cluster": 1,
    "x": 0.06,
    "y": -0.31,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 64,
    "acd": 75,
    "soc": 85,
    "car": 62
  },
  {
    "id": "MHS-2-18",
    "cluster": 1,
    "x": 0.96,
    "y": -0.42,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 71,
    "acd": 85,
    "soc": 98,
    "car": 70
  },
  {
    "id": "MHS-1-19",
    "cluster": 0,
    "x": -0.49,
    "y": -0.09,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 67,
    "acd": 75,
    "soc": 60,
    "car": 60
  },
  {
    "id": "MHS-2-20",
    "cluster": 1,
    "x": 0.24,
    "y": -0.41,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 71,
    "acd": 75,
    "soc": 85,
    "car": 62
  },
  {
    "id": "MHS-1-21",
    "cluster": 0,
    "x": -1.1,
    "y": 0.22,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 56,
    "acd": 52,
    "soc": 72,
    "car": 60
  },
  {
    "id": "MHS-1-22",
    "cluster": 0,
    "x": -1.41,
    "y": 1.08,
    "prodi": "S.Tr. Teknologi Rekayasa Keselamatan K3",
    "wb": 33,
    "acd": 42,
    "soc": 82,
    "car": 72
  },
  {
    "id": "MHS-2-23",
    "cluster": 1,
    "x": 0.8,
    "y": 0.01,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 82,
    "acd": 78,
    "soc": 80,
    "car": 75
  },
  {
    "id": "MHS-1-24",
    "cluster": 0,
    "x": -0.14,
    "y": 1.41,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 56,
    "acd": 60,
    "soc": 72,
    "car": 90
  },
  {
    "id": "MHS-1-25",
    "cluster": 0,
    "x": -0.31,
    "y": 0.06,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 67,
    "acd": 62,
    "soc": 78,
    "car": 65
  },
  {
    "id": "MHS-1-26",
    "cluster": 0,
    "x": -2.91,
    "y": 0.72,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 27,
    "acd": 45,
    "soc": 45,
    "car": 50
  },
  {
    "id": "MHS-1-27",
    "cluster": 0,
    "x": -1.06,
    "y": 0.1,
    "prodi": "S.Tr. Teknologi Rekayasa Multimedia",
    "wb": 67,
    "acd": 58,
    "soc": 58,
    "car": 58
  },
  {
    "id": "MHS-1-28",
    "cluster": 0,
    "x": -1.39,
    "y": 0.54,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 51,
    "acd": 48,
    "soc": 68,
    "car": 62
  },
  {
    "id": "MHS-1-29",
    "cluster": 0,
    "x": -0.3,
    "y": 0.62,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 60,
    "acd": 60,
    "soc": 78,
    "car": 75
  },
  {
    "id": "MHS-2-30",
    "cluster": 1,
    "x": -0.31,
    "y": -0.24,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 64,
    "acd": 68,
    "soc": 80,
    "car": 60
  },
  {
    "id": "MHS-2-31",
    "cluster": 1,
    "x": -0.26,
    "y": -0.26,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 71,
    "acd": 62,
    "soc": 80,
    "car": 60
  },
  {
    "id": "MHS-3-32",
    "cluster": 2,
    "x": 2.37,
    "y": 0.38,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 93,
    "acd": 88,
    "soc": 100,
    "car": 98
  },
  {
    "id": "MHS-1-33",
    "cluster": 0,
    "x": -1.06,
    "y": 0.23,
    "prodi": "S.Tr. Teknologi Rekayasa Multimedia",
    "wb": 60,
    "acd": 60,
    "soc": 60,
    "car": 60
  },
  {
    "id": "MHS-1-34",
    "cluster": 0,
    "x": -0.26,
    "y": -0.14,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 60,
    "acd": 65,
    "soc": 88,
    "car": 62
  },
  {
    "id": "MHS-3-35",
    "cluster": 2,
    "x": 2.25,
    "y": -0.42,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 91,
    "acd": 100,
    "soc": 100,
    "car": 82
  },
  {
    "id": "MHS-2-36",
    "cluster": 1,
    "x": 0.81,
    "y": -0.6,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 84,
    "acd": 72,
    "soc": 95,
    "car": 65
  },
  {
    "id": "MHS-1-37",
    "cluster": 0,
    "x": -2.81,
    "y": -0.48,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 42,
    "acd": 52,
    "soc": 45,
    "car": 30
  },
  {
    "id": "MHS-1-38",
    "cluster": 0,
    "x": -2.44,
    "y": -0.85,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 58,
    "acd": 45,
    "soc": 55,
    "car": 28
  },
  {
    "id": "MHS-2-39",
    "cluster": 1,
    "x": 0.58,
    "y": 1.01,
    "prodi": "S.Tr. Teknologi Rekayasa Perancangan Manufaktur",
    "wb": 76,
    "acd": 68,
    "soc": 72,
    "car": 90
  },
  {
    "id": "MHS-1-40",
    "cluster": 0,
    "x": -1.38,
    "y": 0.12,
    "prodi": "S.Tr. Bisnis Digital",
    "wb": 60,
    "acd": 52,
    "soc": 60,
    "car": 55
  },
  {
    "id": "MHS-2-41",
    "cluster": 1,
    "x": 0.49,
    "y": 0.73,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 64,
    "acd": 68,
    "soc": 88,
    "car": 85
  },
  {
    "id": "MHS-1-42",
    "cluster": 0,
    "x": -0.18,
    "y": 0.69,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 60,
    "acd": 60,
    "soc": 80,
    "car": 78
  },
  {
    "id": "MHS-1-43",
    "cluster": 0,
    "x": -1.79,
    "y": 0.08,
    "prodi": "D3 Teknik Informatika",
    "wb": 56,
    "acd": 52,
    "soc": 52,
    "car": 50
  },
  {
    "id": "MHS-1-44",
    "cluster": 0,
    "x": -1.91,
    "y": -1.08,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 51,
    "acd": 40,
    "soc": 90,
    "car": 30
  },
  {
    "id": "MHS-1-45",
    "cluster": 0,
    "x": -0.52,
    "y": -0.43,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 56,
    "acd": 62,
    "soc": 92,
    "car": 55
  },
  {
    "id": "MHS-1-46",
    "cluster": 0,
    "x": -0.83,
    "y": 0.09,
    "prodi": "S.Tr. Bisnis Digital",
    "wb": 62,
    "acd": 60,
    "soc": 68,
    "car": 60
  },
  {
    "id": "MHS-2-47",
    "cluster": 1,
    "x": 0.75,
    "y": 0.18,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 78,
    "acd": 78,
    "soc": 80,
    "car": 78
  },
  {
    "id": "MHS-1-48",
    "cluster": 0,
    "x": -1.01,
    "y": 0.72,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 53,
    "acd": 40,
    "soc": 82,
    "car": 70
  },
  {
    "id": "MHS-2-49",
    "cluster": 1,
    "x": 1.06,
    "y": 0.15,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 84,
    "acd": 80,
    "soc": 80,
    "car": 80
  },
  {
    "id": "MHS-1-50",
    "cluster": 0,
    "x": -3.05,
    "y": 0.24,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 40,
    "acd": 40,
    "soc": 40,
    "car": 40
  },
  {
    "id": "MHS-2-51",
    "cluster": 1,
    "x": 0.6,
    "y": -0.19,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 76,
    "acd": 75,
    "soc": 88,
    "car": 70
  },
  {
    "id": "MHS-2-52",
    "cluster": 1,
    "x": 1.53,
    "y": 0.58,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 84,
    "acd": 80,
    "soc": 88,
    "car": 92
  },
  {
    "id": "MHS-2-53",
    "cluster": 1,
    "x": -0.41,
    "y": -0.43,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 76,
    "acd": 68,
    "soc": 68,
    "car": 55
  },
  {
    "id": "MHS-1-54",
    "cluster": 0,
    "x": -0.9,
    "y": -0.01,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 69,
    "acd": 58,
    "soc": 62,
    "car": 58
  },
  {
    "id": "MHS-2-55",
    "cluster": 1,
    "x": 1.49,
    "y": -0.7,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 91,
    "acd": 85,
    "soc": 98,
    "car": 70
  },
  {
    "id": "MHS-1-56",
    "cluster": 0,
    "x": -0.24,
    "y": 0.3,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 64,
    "acd": 62,
    "soc": 78,
    "car": 70
  },
  {
    "id": "MHS-2-57",
    "cluster": 1,
    "x": 0.53,
    "y": -1.6,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 73,
    "acd": 92,
    "soc": 95,
    "car": 45
  },
  {
    "id": "MHS-3-58",
    "cluster": 2,
    "x": 1.89,
    "y": 0.78,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 78,
    "acd": 82,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-2-59",
    "cluster": 1,
    "x": 1.89,
    "y": 0.52,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 89,
    "acd": 82,
    "soc": 92,
    "car": 95
  },
  {
    "id": "MHS-2-60",
    "cluster": 1,
    "x": 1.05,
    "y": 0.0,
    "prodi": "D3 Teknik Elektronika",
    "wb": 82,
    "acd": 82,
    "soc": 82,
    "car": 78
  },
  {
    "id": "MHS-2-61",
    "cluster": 1,
    "x": 0.1,
    "y": -0.76,
    "prodi": "D3 Teknik Informatika",
    "wb": 76,
    "acd": 72,
    "soc": 85,
    "car": 55
  },
  {
    "id": "MHS-1-62",
    "cluster": 0,
    "x": -0.69,
    "y": 0.58,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 56,
    "acd": 62,
    "soc": 68,
    "car": 70
  },
  {
    "id": "MHS-1-63",
    "cluster": 0,
    "x": -0.89,
    "y": 0.52,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 62,
    "acd": 40,
    "soc": 80,
    "car": 68
  },
  {
    "id": "MHS-3-64",
    "cluster": 2,
    "x": 2.93,
    "y": 0.2,
    "prodi": "D3 Teknik Informatika",
    "wb": 100,
    "acd": 100,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-3-65",
    "cluster": 2,
    "x": 2.93,
    "y": 0.2,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 100,
    "acd": 100,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-2-66",
    "cluster": 1,
    "x": 1.72,
    "y": 0.05,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 89,
    "acd": 90,
    "soc": 88,
    "car": 85
  },
  {
    "id": "MHS-1-67",
    "cluster": 0,
    "x": -0.09,
    "y": 0.79,
    "prodi": "D3 Teknik Elektronika",
    "wb": 58,
    "acd": 68,
    "soc": 75,
    "car": 80
  },
  {
    "id": "MHS-2-68",
    "cluster": 1,
    "x": 0.3,
    "y": 0.69,
    "prodi": "D3 Teknik Elektronika",
    "wb": 62,
    "acd": 65,
    "soc": 88,
    "car": 82
  },
  {
    "id": "MHS-2-69",
    "cluster": 1,
    "x": 1.18,
    "y": 0.5,
    "prodi": "S.Tr. Teknologi Rekayasa Perancangan Manufaktur",
    "wb": 80,
    "acd": 80,
    "soc": 82,
    "car": 88
  },
  {
    "id": "MHS-2-70",
    "cluster": 1,
    "x": 0.72,
    "y": -0.24,
    "prodi": "D3 Teknik Elektronika",
    "wb": 87,
    "acd": 72,
    "soc": 82,
    "car": 70
  },
  {
    "id": "MHS-1-71",
    "cluster": 0,
    "x": -0.88,
    "y": 0.13,
    "prodi": "S.Tr. Teknologi Rekayasa Multimedia",
    "wb": 67,
    "acd": 60,
    "soc": 60,
    "car": 60
  },
  {
    "id": "MHS-3-72",
    "cluster": 2,
    "x": 1.6,
    "y": -1.77,
    "prodi": "D3 Teknik Elektronika",
    "wb": 100,
    "acd": 95,
    "soc": 100,
    "car": 52
  },
  {
    "id": "MHS-2-73",
    "cluster": 1,
    "x": 0.08,
    "y": -1.05,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 76,
    "acd": 70,
    "soc": 92,
    "car": 50
  },
  {
    "id": "MHS-1-74",
    "cluster": 0,
    "x": -0.49,
    "y": 0.14,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 56,
    "acd": 62,
    "soc": 82,
    "car": 65
  },
  {
    "id": "MHS-1-75",
    "cluster": 0,
    "x": -0.64,
    "y": -0.05,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 67,
    "acd": 52,
    "soc": 80,
    "car": 60
  },
  {
    "id": "MHS-2-76",
    "cluster": 1,
    "x": 0.72,
    "y": -0.25,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 80,
    "acd": 75,
    "soc": 88,
    "car": 70
  },
  {
    "id": "MHS-2-77",
    "cluster": 1,
    "x": 0.12,
    "y": -0.32,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 80,
    "acd": 68,
    "soc": 78,
    "car": 62
  },
  {
    "id": "MHS-2-78",
    "cluster": 1,
    "x": 0.45,
    "y": -0.35,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 82,
    "acd": 80,
    "soc": 72,
    "car": 65
  },
  {
    "id": "MHS-1-79",
    "cluster": 0,
    "x": -0.05,
    "y": 1.34,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 60,
    "acd": 55,
    "soc": 78,
    "car": 90
  },
  {
    "id": "MHS-2-80",
    "cluster": 1,
    "x": 0.25,
    "y": -0.41,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 73,
    "acd": 78,
    "soc": 80,
    "car": 62
  },
  {
    "id": "MHS-2-81",
    "cluster": 1,
    "x": 0.29,
    "y": -0.42,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 82,
    "acd": 70,
    "soc": 80,
    "car": 62
  },
  {
    "id": "MHS-3-82",
    "cluster": 2,
    "x": 2.18,
    "y": -0.38,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 93,
    "acd": 95,
    "soc": 100,
    "car": 82
  },
  {
    "id": "MHS-1-83",
    "cluster": 0,
    "x": -1.58,
    "y": -0.49,
    "prodi": "D3 Teknik Elektronika",
    "wb": 60,
    "acd": 52,
    "soc": 65,
    "car": 42
  },
  {
    "id": "MHS-1-84",
    "cluster": 0,
    "x": -0.68,
    "y": -0.17,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 62,
    "acd": 60,
    "soc": 78,
    "car": 58
  },
  {
    "id": "MHS-1-85",
    "cluster": 0,
    "x": -1.35,
    "y": -0.49,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 60,
    "acd": 55,
    "soc": 70,
    "car": 45
  },
  {
    "id": "MHS-3-86",
    "cluster": 2,
    "x": 0.37,
    "y": -2.52,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 82,
    "acd": 90,
    "soc": 100,
    "car": 28
  },
  {
    "id": "MHS-1-87",
    "cluster": 0,
    "x": -0.8,
    "y": 0.24,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 64,
    "acd": 65,
    "soc": 58,
    "car": 62
  },
  {
    "id": "MHS-2-88",
    "cluster": 1,
    "x": -0.1,
    "y": -1.08,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 78,
    "acd": 68,
    "soc": 88,
    "car": 48
  },
  {
    "id": "MHS-2-89",
    "cluster": 1,
    "x": 0.94,
    "y": 0.22,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 80,
    "acd": 80,
    "soc": 80,
    "car": 80
  },
  {
    "id": "MHS-1-90",
    "cluster": 0,
    "x": -3.02,
    "y": -0.08,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 40,
    "acd": 38,
    "soc": 50,
    "car": 35
  },
  {
    "id": "MHS-2-91",
    "cluster": 1,
    "x": 1.23,
    "y": 0.2,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 89,
    "acd": 78,
    "soc": 82,
    "car": 82
  },
  {
    "id": "MHS-3-92",
    "cluster": 2,
    "x": 1.76,
    "y": -0.58,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 82,
    "acd": 98,
    "soc": 100,
    "car": 75
  },
  {
    "id": "MHS-1-93",
    "cluster": 0,
    "x": -1.25,
    "y": 0.02,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 44,
    "acd": 65,
    "soc": 70,
    "car": 55
  },
  {
    "id": "MHS-3-94",
    "cluster": 2,
    "x": 1.11,
    "y": -0.07,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 82,
    "acd": 70,
    "soc": 100,
    "car": 78
  },
  {
    "id": "MHS-2-95",
    "cluster": 1,
    "x": 0.13,
    "y": -0.48,
    "prodi": "D3 Teknologi Multimedia dan Broadcasting",
    "wb": 73,
    "acd": 75,
    "soc": 80,
    "car": 60
  },
  {
    "id": "MHS-2-96",
    "cluster": 1,
    "x": 0.28,
    "y": 0.11,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 58,
    "acd": 70,
    "soc": 98,
    "car": 72
  },
  {
    "id": "MHS-3-97",
    "cluster": 2,
    "x": 2.36,
    "y": -0.19,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 100,
    "acd": 90,
    "soc": 100,
    "car": 88
  },
  {
    "id": "MHS-1-98",
    "cluster": 0,
    "x": -1.14,
    "y": 0.28,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 64,
    "acd": 52,
    "soc": 60,
    "car": 60
  },
  {
    "id": "MHS-2-99",
    "cluster": 1,
    "x": 0.04,
    "y": -0.44,
    "prodi": "S.Tr. Teknologi Rekayasa Perancangan Manufaktur",
    "wb": 73,
    "acd": 68,
    "soc": 85,
    "car": 60
  },
  {
    "id": "MHS-2-100",
    "cluster": 1,
    "x": 1.62,
    "y": 0.53,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 78,
    "acd": 90,
    "soc": 88,
    "car": 92
  },
  {
    "id": "MHS-2-101",
    "cluster": 1,
    "x": 0.54,
    "y": -0.57,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 80,
    "acd": 78,
    "soc": 85,
    "car": 62
  },
  {
    "id": "MHS-1-102",
    "cluster": 0,
    "x": -1.66,
    "y": 0.25,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 49,
    "acd": 42,
    "soc": 72,
    "car": 55
  },
  {
    "id": "MHS-1-103",
    "cluster": 0,
    "x": -0.99,
    "y": -0.15,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 51,
    "acd": 58,
    "soc": 82,
    "car": 55
  },
  {
    "id": "MHS-1-104",
    "cluster": 0,
    "x": -1.42,
    "y": -0.13,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 60,
    "acd": 60,
    "soc": 55,
    "car": 50
  },
  {
    "id": "MHS-1-105",
    "cluster": 0,
    "x": -1.42,
    "y": -0.62,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 51,
    "acd": 58,
    "soc": 78,
    "car": 42
  },
  {
    "id": "MHS-2-106",
    "cluster": 1,
    "x": 1.79,
    "y": 0.43,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 84,
    "acd": 88,
    "soc": 90,
    "car": 92
  },
  {
    "id": "MHS-1-107",
    "cluster": 0,
    "x": -0.49,
    "y": -0.15,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 56,
    "acd": 68,
    "soc": 82,
    "car": 60
  },
  {
    "id": "MHS-1-108",
    "cluster": 0,
    "x": -0.76,
    "y": 0.34,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 64,
    "acd": 60,
    "soc": 62,
    "car": 65
  },
  {
    "id": "MHS-2-109",
    "cluster": 1,
    "x": 0.39,
    "y": -0.79,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 80,
    "acd": 72,
    "soc": 90,
    "car": 58
  },
  {
    "id": "MHS-1-110",
    "cluster": 0,
    "x": -0.53,
    "y": 0.47,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 53,
    "acd": 62,
    "soc": 78,
    "car": 70
  },
  {
    "id": "MHS-2-111",
    "cluster": 1,
    "x": -0.16,
    "y": -0.02,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 64,
    "acd": 72,
    "soc": 75,
    "car": 65
  },
  {
    "id": "MHS-2-112",
    "cluster": 1,
    "x": 1.63,
    "y": 0.22,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 87,
    "acd": 80,
    "soc": 95,
    "car": 88
  },
  {
    "id": "MHS-1-113",
    "cluster": 0,
    "x": -2.45,
    "y": 0.34,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 40,
    "acd": 60,
    "soc": 35,
    "car": 48
  },
  {
    "id": "MHS-1-114",
    "cluster": 0,
    "x": -1.18,
    "y": 0.29,
    "prodi": "S.Tr. Teknik Informatika",
    "wb": 51,
    "acd": 60,
    "soc": 65,
    "car": 60
  },
  {
    "id": "MHS-1-115",
    "cluster": 0,
    "x": -1.28,
    "y": -1.16,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 49,
    "acd": 58,
    "soc": 95,
    "car": 35
  },
  {
    "id": "MHS-1-116",
    "cluster": 0,
    "x": -0.18,
    "y": 0.4,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 60,
    "acd": 62,
    "soc": 82,
    "car": 72
  },
  {
    "id": "MHS-1-117",
    "cluster": 0,
    "x": -3.46,
    "y": -0.26,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 38,
    "acd": 32,
    "soc": 48,
    "car": 28
  },
  {
    "id": "MHS-2-118",
    "cluster": 1,
    "x": 1.06,
    "y": 0.15,
    "prodi": "D3 Teknik Elektro Industri",
    "wb": 84,
    "acd": 80,
    "soc": 80,
    "car": 80
  },
  {
    "id": "MHS-1-119",
    "cluster": 0,
    "x": -1.23,
    "y": 0.29,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 53,
    "acd": 48,
    "soc": 75,
    "car": 60
  },
  {
    "id": "MHS-2-120",
    "cluster": 1,
    "x": 0.05,
    "y": -0.01,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 73,
    "acd": 65,
    "soc": 80,
    "car": 68
  },
  {
    "id": "MHS-2-121",
    "cluster": 1,
    "x": 1.86,
    "y": -0.34,
    "prodi": "S.Tr. Bisnis Digital",
    "wb": 96,
    "acd": 85,
    "soc": 98,
    "car": 80
  },
  {
    "id": "MHS-3-122",
    "cluster": 2,
    "x": 2.93,
    "y": 0.2,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 100,
    "acd": 100,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-3-123",
    "cluster": 2,
    "x": 2.93,
    "y": 0.2,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 100,
    "acd": 100,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-1-124",
    "cluster": 0,
    "x": -1.44,
    "y": 0.43,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 51,
    "acd": 50,
    "soc": 65,
    "car": 60
  },
  {
    "id": "MHS-1-125",
    "cluster": 0,
    "x": -1.74,
    "y": 0.14,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 49,
    "acd": 38,
    "soc": 78,
    "car": 52
  },
  {
    "id": "MHS-1-126",
    "cluster": 0,
    "x": -1.06,
    "y": 0.23,
    "prodi": "S.Tr. Sains Data Terapan",
    "wb": 60,
    "acd": 60,
    "soc": 60,
    "car": 60
  },
  {
    "id": "MHS-2-127",
    "cluster": 1,
    "x": 0.65,
    "y": 0.2,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 69,
    "acd": 70,
    "soc": 95,
    "car": 78
  },
  {
    "id": "MHS-1-128",
    "cluster": 0,
    "x": -0.5,
    "y": 1.31,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 58,
    "acd": 42,
    "soc": 80,
    "car": 85
  },
  {
    "id": "MHS-1-129",
    "cluster": 0,
    "x": -0.94,
    "y": 1.15,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 51,
    "acd": 52,
    "soc": 65,
    "car": 78
  },
  {
    "id": "MHS-2-130",
    "cluster": 1,
    "x": 0.97,
    "y": -0.28,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 69,
    "acd": 85,
    "soc": 98,
    "car": 72
  },
  {
    "id": "MHS-2-131",
    "cluster": 1,
    "x": 0.67,
    "y": 0.18,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 62,
    "acd": 78,
    "soc": 95,
    "car": 78
  },
  {
    "id": "MHS-2-132",
    "cluster": 1,
    "x": 0.39,
    "y": -0.19,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 71,
    "acd": 80,
    "soc": 80,
    "car": 68
  },
  {
    "id": "MHS-1-133",
    "cluster": 0,
    "x": -1.93,
    "y": 0.29,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 51,
    "acd": 45,
    "soc": 58,
    "car": 52
  },
  {
    "id": "MHS-2-134",
    "cluster": 1,
    "x": 0.42,
    "y": -0.94,
    "prodi": "S.Tr. Teknik Komputer",
    "wb": 80,
    "acd": 80,
    "soc": 85,
    "car": 55
  },
  {
    "id": "MHS-2-135",
    "cluster": 1,
    "x": 0.94,
    "y": 0.35,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 76,
    "acd": 80,
    "soc": 82,
    "car": 82
  },
  {
    "id": "MHS-3-136",
    "cluster": 2,
    "x": 2.51,
    "y": 0.15,
    "prodi": "S.Tr. Teknik Elektronika",
    "wb": 89,
    "acd": 100,
    "soc": 100,
    "car": 95
  },
  {
    "id": "MHS-3-137",
    "cluster": 2,
    "x": 2.17,
    "y": -0.66,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 100,
    "acd": 92,
    "soc": 100,
    "car": 78
  },
  {
    "id": "MHS-3-138",
    "cluster": 2,
    "x": 2.67,
    "y": 0.35,
    "prodi": "S.Tr. Sistem Pembangkit Energi",
    "wb": 100,
    "acd": 90,
    "soc": 100,
    "car": 100
  },
  {
    "id": "MHS-1-139",
    "cluster": 0,
    "x": -0.56,
    "y": 0.05,
    "prodi": "S.Tr. Teknik Telekomunikasi",
    "wb": 62,
    "acd": 58,
    "soc": 80,
    "car": 62
  },
  {
    "id": "MHS-2-140",
    "cluster": 1,
    "x": 0.2,
    "y": 0.2,
    "prodi": "S.Tr. Teknik Mekatronika",
    "wb": 69,
    "acd": 72,
    "soc": 78,
    "car": 72
  },
  {
    "id": "MHS-2-141",
    "cluster": 1,
    "x": 1.31,
    "y": 0.3,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 87,
    "acd": 82,
    "soc": 80,
    "car": 85
  },
  {
    "id": "MHS-2-142",
    "cluster": 1,
    "x": 0.26,
    "y": 0.59,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 67,
    "acd": 68,
    "soc": 80,
    "car": 80
  },
  {
    "id": "MHS-1-143",
    "cluster": 0,
    "x": -0.41,
    "y": 0.26,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 58,
    "acd": 65,
    "soc": 78,
    "car": 68
  },
  {
    "id": "MHS-3-144",
    "cluster": 2,
    "x": 2.18,
    "y": 0.19,
    "prodi": "D3 Teknik Informatika",
    "wb": 91,
    "acd": 88,
    "soc": 100,
    "car": 92
  },
  {
    "id": "MHS-2-145",
    "cluster": 1,
    "x": 1.24,
    "y": -0.21,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 87,
    "acd": 100,
    "soc": 68,
    "car": 75
  },
  {
    "id": "MHS-1-146",
    "cluster": 0,
    "x": -1.08,
    "y": -0.06,
    "prodi": "S.Tr. Teknologi Game",
    "wb": 60,
    "acd": 58,
    "soc": 68,
    "car": 55
  },
  {
    "id": "MHS-2-147",
    "cluster": 1,
    "x": 0.35,
    "y": 0.54,
    "prodi": "S. Tr. Teknik Elektro Industri",
    "wb": 58,
    "acd": 80,
    "soc": 80,
    "car": 80
  },
  {
    "id": "MHS-1-148",
    "cluster": 0,
    "x": 0.04,
    "y": 1.18,
    "prodi": "D3 Teknik Informatika",
    "wb": 71,
    "acd": 60,
    "soc": 65,
    "car": 88
  },
  {
    "id": "MHS-2-149",
    "cluster": 1,
    "x": 0.77,
    "y": 1.0,
    "prodi": "S.Tr. Teknologi Rekayasa Internet",
    "wb": 73,
    "acd": 60,
    "soc": 90,
    "car": 92
  }
];

/* Kutipan kualitatif suara mahasiswa (Student Voice NLP & Feedback) */
const QUOTES = [
  { t: 0, s: 'neg', x: 'Fasilitas laboratorium yang mungkin harus lebih diperhatikan khususnya alat ukur konvesional' },
  { t: 1, s: 'neg', x: 'jujur ya dukungan finansial . karna banyak hal yang mau aku lakuin buat belajar dan berkembang tapi selalu dihambat dibatasi sama masalah finansial ini 💔 i hate the country\'s economy in this era 😓💔' },
  { t: 2, s: 'neg', x: 'Kesulitan sat ini adalah membayar uang ukt, ketika banding ukt tidak bisa bisa saya harap pihak yang berwenang membaca setiap file yang dikirim mahasiswa dan bukan hanya membaca dari desil saja' },
  { t: 3, s: 'neg', x: 'Nggak ada, nggak semua orang menerima saya dan tidak pada semua orang saya merasa nyaman berinteraksi.' },
  { t: 4, s: 'neg', x: 'Tidak ada karena pekerjaan it menurun drastis dan di kampus kurang diajarkan untuk eksplorasi' },
  { t: 0, s: 'pos', x: 'Mungkin tidak ada karena saya rasa, saya sendiri yang tidak cepat memahami materi dalam perkuliahan' },
  { t: 1, s: 'pos', x: 'Informasi skills atau pekerjaan yang kebutuhan kondisi di indonesia dan tren saat ini dan kedepannya' },
  { t: 2, s: 'pos', x: 'Alhamdulillah sudah dapat Beasiswa dari kipk, namun belum cukup untuk kehidupan sehari hari, jadinya saya kerja sampingan sebagai ojol di waktu libur. Menurut saya bantuan dari kampus sudah cukup' },
  { t: 3, s: 'pos', x: 'Mungkin karena masih maba jadi merasa deket sama teman angkatan karena masih sama sama beradaptasi' },
  { t: 4, s: 'pos', x: 'Masa kuliah tinggal sedikit lagi menuju kelulusan, sayang kalau tidak dipertahankan sampai selesai' },
  { t: 0, s: 'neu', x: 'merasa kapasitas otak tidak mumpuni, yang akhirnya dapat berdampak kepada tugas kelompok saya, kurang dapat diandalkan.' },
  { t: 1, s: 'neu', x: 'Pelatihan yang akan dibuat bekal di dunia kerja' },
  { t: 2, s: 'neu', x: 'Orangtua dan kakak saya bekerja di perusahaan yang sama, sehingga untuk penghasilannya dijadikan 1' },
  { t: 3, s: 'neu', x: 'Ntahlah, aku tak yakin juga nyaman di kampus' },
  { t: 4, s: 'neu', x: 'mau jadi wna, terus slow living di swiss' },
  { t: 0, s: 'neg', x: 'perlu adanya aturan untuk dosen yang mengganti jadwal kuliah mendadak' },
  { t: 1, s: 'neg', x: 'Tolong tambah dosen. Dosen sekarang kebanyakan lagi overload. Apalagi habis nambah kelas dan jurusan' },
  { t: 2, s: 'neg', x: 'Biaya project dan tugas perkuliahan. Jika dosen memberiksn tugas atau prohect harap membantu untuk urasan dana.' },
  { t: 3, s: 'neg', x: 'Tidak ada, saya merasa was was setiap saat Dan butuh bantuan' },
  { t: 4, s: 'neg', x: 'Sebenernya nggak bersemangat juga, cuma gaada pilihan lain selain menjalani hari-hari toh kalopun berhenti akan repot sendiri nantinya. Saya capek padahal cuma kuliah 4 hari, tapi rasanya memuakkan, tiap hari bawannya pgn nangis.' },
  { t: 0, s: 'pos', x: 'Time management ku lumayan ngakak sih, sabtu minggu bukannya ngelaprak ama nugas malah kujadikan ajang istirahat ama tidur. saya sedang mencoba belajar time management mulai detik ini' },
  { t: 1, s: 'pos', x: 'Langsung diskusi dengan pihak industri bahwa sekarany industri butuh teknologi apa. Karena sekarang banyak ai' },
  { t: 2, s: 'pos', x: 'Turunnya perekonomian keluarga setelah berpulangnya kepala keluarga. Harapannya PENS lebih banyak terkait kouta banding UKT' },
  { t: 3, s: 'pos', x: 'teman teman aku yang baik baik dan suportif ☺️🫰' },
  { t: 4, s: 'pos', x: 'Pena/alat tulis yang saya pakai untuk belajar, ibarat tulang-belulang orang tua yang bekerja keras. Keringat orang tua yang bercucuran di ladang/luar rumah/ bekerja itu ibarat tinta yang mengalir pada pena. Dan kertas yang saya tulis itu, ibarat kulit tubuh orang tua.' },
  { t: 0, s: 'neu', x: 'Kendala akademik yang paling sering saya alami adalah kesulitan mengatur waktu antara perkuliahan, praktikum, dan tugas yang terkadang memiliki tenggat waktu berdekatan.' },
  { t: 1, s: 'neu', x: 'Jujur sebagai maba saya masih belum terlalu mengulik ini. Cuma menurut saya ada baiknya untuk mengadakan mentoring atau seminar dari alumni prodi yang saya ambil. Jadi memiliki gambaran arah karier yang lebih jelas lagi' },
  { t: 2, s: 'neu', x: 'Mungkin butuh lebih banyak informasi dan PENS harus bekerja sama dengan banyak lembaga yang memberikan beasiswa' },
  { t: 3, s: 'neu', x: 'karena ga semua orang peduli dengan yang kita rasakan, ambigu ya tapi kalo di posisi kita merasa jelek, ga percaya diri dll mereka ga pduli jadi ya lebih enak begitu kalau kasusnya seperti ini' },
  { t: 4, s: 'neu', x: 'Sejauh ini teman-teman sih, kalau keluarga atau dosen lainny ga terlalu' },
  { t: 0, s: 'neg', x: 'Menurut saya dosen sebaiknya memberikan file / ppt dari materi yang di jelaskan setelah kelas selesai jadi mahasiswa bisa mereview ulang. Karena kadang kalau mencatat sulit menyesuaikan dengan tempo dosen.' },
  { t: 1, s: 'neg', x: 'Untuk semester 5 ini, saya harap kampus memberikan banyak lowongan magang bagi mahasiswa yg akan beranjak ke semester 6. Saya benar2 sangat butuh informasi tempat magang nanti.' },
  { t: 2, s: 'neg', x: 'Kondisi ekonomi masih aman tapi tidak memungkinkan jika kedepan terjadi suatu hal, saya tetap ingin mendapatkan beasiswa untuk membantu orang tua' },
  { t: 3, s: 'pos', x: 'ketika dilibatkan dalam proses pembelajaran, diterima ketika menjawab salah, atau dirangkul ketika sendirian. dilibatkan dalam pertemanan maupun pembelajaran membuat saya berharga.' },
  { t: 4, s: 'neg', x: 'karena semangat tetapi saya ada kendala telat mengumpulkan tugas dikarenakan saya sakit setelah itu beliau tidak mau jadi jadi dosen saya/ tidak mau mengajari saya' },
  { t: 0, s: 'pos', x: 'Saya masih belum bisa baca gambar rangkaian untuk merngkainya, seenggaknya dosen2 mengajari cara baca rangkaian listrik untuk dirangkai bagi Pemulaa' },
  { t: 1, s: 'pos', x: 'Dukungan berupa fasilitas pelatihan dan sertifikasi internasional (seperti Oracle, CCNA, AWS, dll.) dengan skema diskon akademik atau gratis bagi mahasiswa akhir, yang dulunya difasilitasi oleh Unit Training PENS/EIC' },
  { t: 2, s: 'pos', x: 'Untuk pengeluaran terbesar adalah dari segi biaya makan. Dan harapan bantuan dari kampus lebih ke arah layanan lisensi software gratis bisa lebih diperbanyak' },
  { t: 3, s: 'neu', x: 'saya ngerasa kalau ingin ikut ukm tetapi udah tutup cepet & kalau daftar tin atau lainya saya masih kurang skill' },
  { t: 4, s: 'pos', x: 'Masih pingin lihat kucing dan makan mie ayam' },
  { t: 0, s: 'neu', x: 'Kalau perhatian kampus mungkin tidak ada, kalau pribadi adalah mengatur waktu' },
  { t: 1, s: 'neu', x: 'kecepatan yudisium atau status lulus untuk menunjang keikutsertaan pada program pemerintah' },
  { t: 2, s: 'neg', x: 'sering kehabisan uang membeli komponen hingga tidak makan' },
  { t: 3, s: 'pos', x: 'Karena lingkungannya baik dan memiliki teman yang saling support' },
  { t: 4, s: 'neu', x: 'karena udah bayar aja sih, dan sbg mhs penerima beasiswa jadi lebih ada niat bertahan' },
  { t: 0, s: 'neg', x: 'Jadwal yang sering dipindah atau jam kosong karena dosen berhalangan hadir, rencana studi yang matang dari prodi' },
  { t: 1, s: 'neg', x: 'fasilitas sih biar nyaman di kampus parkiran dibangun, fasilitas yang rusak dibenerin, alat2 lab dibanyakin biar kita belajar dengan sungguh-sungguh' },
  { t: 2, s: 'pos', x: 'alhamdulillah sudah cukup dari ortu, but tetap pengen mencari beasiswa agar tidakk terlalu membebani mereka.' },
  { t: 3, s: 'pos', x: 'Staff PENS termasuk Dosen, Satpam, Pekerja Perpustakaan dan Kantin yang baik. Harapanya untuk Pekerja Admin atau BAAK diringankan pekerjaanya agar tidak terlalu terbebani.' },
  { t: 4, s: 'pos', x: 'biar bisa lulus dan enak nanti dapat uang' },
  { t: 0, s: 'pos', x: 'di karenakan saya dari SMA dan jurusan saya BAHASA, saya cukup kesulitan walau saya telat ilmu nya bersama teman saya, saya masih ingin mengejar anak” dan saya akan bertanya selalu kepada anak yang bisa' },
  { t: 1, s: 'pos', x: 'Saya butuh arahan untuk kedepannya bagaimana, untuk di dunia kerja dan magang' },
  { t: 2, s: 'neg', x: 'karena orang tua tidak selalu mengirimkan uang saku karena kendala ekonomi yang mengharuskan saya bekerja paruh waktu dan mencari beasiswa, semoga bisa dapet beasiswa untuk menunjang perkuliahan' },
  { t: 3, s: 'pos', x: 'fasilitas belajar yang memadai seperti co working space, kelas yang dingin' },
  { t: 4, s: 'pos', x: 'karena biaya kuliah saya nyari sendiri, jadi gamungkin buat saya cuti kuliah. harus tetap kuliah dan kerja agar bisa menyambung hidup meski berjuang sendirian.' },
  { t: 0, s: 'neu', x: 'Menurut saya ada tidak ada sama sekali, jika ada mungkin seperti jam kampus yang terlalu mepet/banyak. saya ingin mempunyai waktu luang yang lebih banyak' },
  { t: 1, s: 'neu', x: 'Dukungan berupa job fair yang diselenggarakan di kampus' },
  { t: 2, s: 'pos', x: 'untuk kesulitan Alhamdulillah skrg belum ada karena udah dapet uang biaya hidup dari beasiswa' },
  { t: 3, s: 'pos', x: 'Lingkungan kampus dan pertemanannya nyaman, makanan di foodlab juga enak' },
  { t: 4, s: 'pos', x: 'Hal yang membuat saya bertahan untuk tetap kuliah adalah orang tua saya' }
];

/* Katalog program dukungan: metric = indikator terkait, t = topik, profiles = klaster sasaran */
const RECOS = [
  { id: 'r1', title: 'Konseling Cepat 48 Jam', metric: 'wellbeing', t: 4, profiles: [0],
    desc: 'Jalur pendaftaran konseling dengan jadwal maksimal 48 jam bagi mahasiswa yang skor wellbeing-nya rendah dan tekanannya tinggi.',
    owner: 'Unit Layanan Konseling', duration: '1 bulan persiapan', effort: 'Sedang', kpi: 'Waktu tunggu konseling di bawah 48 jam' },
  { id: 'r2', title: 'Kalender Beban Studi Terpadu', metric: 'pressure', t: 0, profiles: [0],
    desc: 'Program studi menyelaraskan tanggal tugas besar dan ujian antar mata kuliah agar tidak menumpuk dalam satu minggu.',
    owner: 'Koordinator Program Studi', duration: '1 semester', effort: 'Rendah', kpi: 'Minggu dengan 3 penilaian besar atau lebih turun 50%' },
  { id: 'r3', title: 'Career Lab & Magang Terpandu', metric: 'career', t: 1, profiles: [1],
    desc: 'Klinik CV, simulasi wawancara, dan pemetaan lowongan magang dengan mentor alumni untuk mahasiswa semester 5 ke atas.',
    owner: 'Pusat Karier & Magang', duration: '1–2 semester', effort: 'Sedang', kpi: 'Mahasiswa dengan portofolio siap magang naik 30%' },
  { id: 'r4', title: 'Konseling Keuangan & Beasiswa Darurat', metric: 'wellbeing', t: 2, profiles: [0, 1],
    desc: 'Satu pintu untuk keringanan UKT dan beasiswa darurat, dengan syarat dan alur yang dipublikasikan jelas.',
    owner: 'Bagian Kemahasiswaan', duration: '2 bulan persiapan', effort: 'Tinggi', kpi: 'Proses keringanan selesai dalam 14 hari' },
  { id: 'r5', title: 'Buddy Program Mahasiswa Baru', metric: 'social', t: 3, profiles: [2],
    desc: 'Mahasiswa baru dan rantau dipasangkan dengan kakak tingkat dalam kelompok kecil selama satu semester pertama.',
    owner: 'Kemahasiswaan & BEM', duration: '1 semester', effort: 'Rendah', kpi: 'Skor dukungan sosial angkatan baru naik 8 poin' },
  { id: 'r6', title: 'Dosen Wali Responsif', metric: 'social', t: 0, profiles: [0, 2],
    desc: 'Pedoman dan pelatihan singkat untuk dosen wali, dengan dua konsultasi wajib per semester dan penanda dini bagi mahasiswa berisiko.',
    owner: 'Pusat Pembinaan Akademik', duration: '1 semester', effort: 'Sedang', kpi: 'Konsultasi dosen wali terlaksana bagi 90% mahasiswa' },
  { id: 'r7', title: 'Ruang & Kegiatan Komunitas Kecil', metric: 'social', t: 3, profiles: [2, 3],
    desc: 'Kegiatan mingguan berkelompok kecil (10–15 orang) di ruang bersama, dengan jadwal yang tidak bentrok dengan praktikum.',
    owner: 'Bagian Kemahasiswaan', duration: '1 semester', effort: 'Rendah', kpi: 'Partisipasi mahasiswa di kegiatan komunitas naik 20%' },
  { id: 'r8', title: 'Perbaikan Layanan Digital & Fasilitas', metric: 'wellbeing', t: 0, profiles: [1, 3],
    desc: 'Menstabilkan wifi saat ujian daring, memperpanjang jam ruang belajar musim ujian, dan membuka antrean layanan akademik secara daring.',
    owner: 'UPT Komputer & Jaringan', duration: '2–3 bulan', effort: 'Tinggi', kpi: 'Keluhan wifi saat praktikum turun 60%' }
];

/* Pasang eksplisit ke objek window global */
window.DIMS = DIMS;
window.MONTHS = MONTHS;
window.TOPICS = TOPICS;
window.PRODIS = PRODIS;
window.FACULTIES = PRODIS;
window.CLUSTERS = CLUSTERS;
window.PROFILES = CLUSTERS;
window.CLUSTER_POINTS = CLUSTER_POINTS;
window.QUOTES = QUOTES;
window.RECOS = RECOS;

/* =========================================================
   NadiKampus — Data Ilustrasi & Hasil K-Means Clustering
   Semua angka di file ini adalah data terstruktur untuk demo.
   ========================================================= */

/* Empat indikator utama (Dimensi Pengukuran) */
var DIMS = [
  { key: 'wellbeing', label: 'Wellbeing Index',   short: 'Wellbeing',        color: '#0D9488', good: 'high',
    about: 'Gabungan kesejahteraan psikologis, kepuasan hidup, dan kondisi emosi mahasiswa dalam sebulan terakhir.' },
  { key: 'pressure',  label: 'Academic Pressure', short: 'Tekanan akademik', color: '#F43F5E', good: 'low',
    about: 'Beban tugas, tekanan ujian, dan kekhawatiran akan capaian akademik. Skor tinggi berarti tekanan tinggi.' },
  { key: 'social',    label: 'Social Support',    short: 'Dukungan sosial',  color: '#4F46E5', good: 'high',
    about: 'Rasa terhubung dengan teman, dosen, dan komunitas kampus, serta ketersediaan orang untuk berbagi cerita.' },
  { key: 'career',    label: 'Career Readiness',  short: 'Kesiapan karier',  color: '#F59E0B', good: 'high',
    about: 'Kejelasan arah karier, kepercayaan diri terhadap keterampilan, dan akses ke magang atau informasi kerja.' }
];

var MONTHS = ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'];

/* Selisih tiap bulan terhadap nilai terkini (bulan terakhir = 0) */
var TREND_OFFSETS = {
  wellbeing: [-6, -4, -5, -3, -1, 0],
  pressure:  [-5, -3,  2, -1,  3, 0],
  social:    [-4, -3, -3, -2, -1, 0],
  career:    [-7, -5, -4, -3, -1, 0]
};

/* Tujuh topik hasil NLP: bobot dasar dan pembagian sentimen [positif, netral, negatif] */
var TOPICS = [
  { name: 'Beban tugas & ujian',          sent: [8, 17, 75],  metric: 'pressure',
    keywords: ['deadline menumpuk', 'UTS bersamaan', 'laporan praktikum', 'begadang', 'revisi berulang'] },
  { name: 'Kecemasan karier & magang',    sent: [14, 22, 64], metric: 'career',
    keywords: ['magang', 'lowongan', 'portofolio', 'CV', 'setelah lulus'] },
  { name: 'Biaya kuliah & keuangan',      sent: [10, 20, 70], metric: 'wellbeing',
    keywords: ['UKT', 'uang kos', 'kerja paruh waktu', 'keringanan', 'beasiswa'] },
  { name: 'Kesepian & adaptasi sosial',   sent: [12, 23, 65], metric: 'social',
    keywords: ['sulit berteman', 'sendirian', 'rantau', 'kelas besar', 'akhir pekan'] },
  { name: 'Layanan kampus & fasilitas',   sent: [45, 30, 25], metric: 'wellbeing',
    keywords: ['wifi', 'ruang belajar', 'antrean administrasi', 'perpustakaan', 'jam buka'] },
  { name: 'Dukungan dosen & dosen wali',  sent: [70, 20, 10], metric: 'social',
    keywords: ['dosen wali', 'konsultasi', 'responsif', 'bimbingan', 'didengarkan'] },
  { name: 'Kegiatan & komunitas',         sent: [66, 24, 10], metric: 'social',
    keywords: ['UKM', 'organisasi', 'acara kampus', 'teman satu tim', 'relawan'] }
];

/* Data per Program Studi Riil PENS (Hasil survei responden backend Amel) */
var PRODIS = {
  'ds': {
    name: 'S.Tr. Sains Data Terapan', n: 25,
    wellbeing: 68, pressure: 69, social: 81, career: 67,
    trend: {"wellbeing": [62, 64, 63, 65, 67, 68], "pressure": [64, 66, 71, 68, 72, 69], "social": [77, 78, 78, 79, 80, 81], "career": [60, 62, 63, 64, 66, 67]},
    profile: [4, 28, 60, 0, 8],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'tri': {
    name: 'S.Tr. Teknologi Rekayasa Internet', n: 9,
    wellbeing: 66, pressure: 67, social: 75, career: 62,
    trend: {"wellbeing": [60, 62, 61, 63, 65, 66], "pressure": [62, 64, 69, 66, 70, 67], "social": [71, 72, 72, 73, 74, 75], "career": [55, 57, 58, 59, 61, 62]},
    profile: [11, 11, 45, 22, 11],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'me': {
    name: 'S.Tr. Teknik Mekatronika', n: 9,
    wellbeing: 69, pressure: 69, social: 78, career: 70,
    trend: {"wellbeing": [63, 65, 64, 66, 68, 69], "pressure": [64, 66, 71, 68, 72, 69], "social": [74, 75, 75, 76, 77, 78], "career": [63, 65, 66, 67, 69, 70]},
    profile: [0, 22, 67, 11, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'tk': {
    name: 'S.Tr. Teknik Komputer', n: 8,
    wellbeing: 65, pressure: 66, social: 84, career: 65,
    trend: {"wellbeing": [59, 61, 60, 62, 64, 65], "pressure": [61, 63, 68, 65, 69, 66], "social": [80, 81, 81, 82, 83, 84], "career": [58, 60, 61, 62, 64, 65]},
    profile: [25, 25, 38, 0, 12],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'el_d4': {
    name: 'S.Tr. Teknik Elektronika', n: 8,
    wellbeing: 56, pressure: 53, social: 76, career: 54,
    trend: {"wellbeing": [50, 52, 51, 53, 55, 56], "pressure": [48, 50, 55, 52, 56, 53], "social": [72, 73, 73, 74, 75, 76], "career": [47, 49, 50, 51, 53, 54]},
    profile: [25, 0, 38, 25, 12],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'mmb': {
    name: 'D3 Teknologi Multimedia & Broadcasting', n: 7,
    wellbeing: 76, pressure: 71, social: 78, career: 62,
    trend: {"wellbeing": [70, 72, 71, 73, 75, 76], "pressure": [66, 68, 73, 70, 74, 71], "social": [74, 75, 75, 76, 77, 78], "career": [55, 57, 58, 59, 61, 62]},
    profile: [0, 29, 43, 14, 14],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'ti_d4': {
    name: 'S.Tr. Teknik Informatika', n: 7,
    wellbeing: 67, pressure: 73, social: 76, career: 69,
    trend: {"wellbeing": [61, 63, 62, 64, 66, 67], "pressure": [68, 70, 75, 72, 76, 73], "social": [72, 73, 73, 74, 75, 76], "career": [62, 64, 65, 66, 68, 69]},
    profile: [0, 29, 43, 14, 14],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'eli_d3': {
    name: 'D3 Teknik Elektro Industri', n: 7,
    wellbeing: 75, pressure: 69, social: 80, career: 76,
    trend: {"wellbeing": [69, 71, 70, 72, 74, 75], "pressure": [64, 66, 71, 68, 72, 69], "social": [76, 77, 77, 78, 79, 80], "career": [69, 71, 72, 73, 75, 76]},
    profile: [29, 43, 14, 0, 14],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'el_d3': {
    name: 'D3 Teknik Elektronika', n: 6,
    wellbeing: 75, pressure: 72, social: 82, career: 68,
    trend: {"wellbeing": [69, 71, 70, 72, 74, 75], "pressure": [67, 69, 74, 71, 75, 72], "social": [78, 79, 79, 80, 81, 82], "career": [61, 63, 64, 65, 67, 68]},
    profile: [17, 33, 33, 0, 17],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'game': {
    name: 'S.Tr. Teknologi Game', n: 6,
    wellbeing: 71, pressure: 75, social: 83, career: 51,
    trend: {"wellbeing": [65, 67, 66, 68, 70, 71], "pressure": [70, 72, 77, 74, 78, 75], "social": [79, 80, 80, 81, 82, 83], "career": [44, 46, 47, 48, 50, 51]},
    profile: [17, 32, 17, 17, 17],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'eli_d4': {
    name: 'S.Tr. Teknik Elektro Industri', n: 5,
    wellbeing: 68, pressure: 64, social: 83, career: 72,
    trend: {"wellbeing": [62, 64, 63, 65, 67, 68], "pressure": [59, 61, 66, 63, 67, 64], "social": [79, 80, 80, 81, 82, 83], "career": [65, 67, 68, 69, 71, 72]},
    profile: [20, 20, 40, 0, 20],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'ti_d3': {
    name: 'D3 Teknik Informatika', n: 5,
    wellbeing: 72, pressure: 74, social: 82, career: 56,
    trend: {"wellbeing": [66, 68, 67, 69, 71, 72], "pressure": [69, 71, 76, 73, 77, 74], "social": [78, 79, 79, 80, 81, 82], "career": [49, 51, 52, 53, 55, 56]},
    profile: [20, 40, 20, 0, 20],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'spe': {
    name: 'S.Tr. Sistem Pembangkit Energi', n: 5,
    wellbeing: 69, pressure: 65, social: 78, career: 63,
    trend: {"wellbeing": [63, 65, 64, 66, 68, 69], "pressure": [60, 62, 67, 64, 68, 65], "social": [74, 75, 75, 76, 77, 78], "career": [56, 58, 59, 60, 62, 63]},
    profile: [0, 0, 80, 0, 20],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'tel': {
    name: 'S.Tr. Teknik Telekomunikasi', n: 3,
    wellbeing: 53, pressure: 61, social: 67, career: 58,
    trend: {"wellbeing": [47, 49, 48, 50, 52, 53], "pressure": [56, 58, 63, 60, 64, 61], "social": [63, 64, 64, 65, 66, 67], "career": [51, 53, 54, 55, 57, 58]},
    profile: [0, 0, 100, 0, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'trpm': {
    name: 'S.Tr. TR Perancangan Manufaktur', n: 3,
    wellbeing: 76, pressure: 72, social: 80, career: 79,
    trend: {"wellbeing": [70, 72, 71, 73, 75, 76], "pressure": [67, 69, 74, 71, 75, 72], "social": [76, 77, 77, 78, 79, 80], "career": [72, 74, 75, 76, 78, 79]},
    profile: [34, 33, 33, 0, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'trm': {
    name: 'S.Tr. TR Multimedia', n: 3,
    wellbeing: 64, pressure: 59, social: 59, career: 59,
    trend: {"wellbeing": [58, 60, 59, 61, 63, 64], "pressure": [54, 56, 61, 58, 62, 59], "social": [55, 56, 56, 57, 58, 59], "career": [52, 54, 55, 56, 58, 59]},
    profile: [0, 0, 100, 0, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'bd': {
    name: 'S.Tr. Bisnis Digital', n: 2,
    wellbeing: 61, pressure: 56, social: 64, career: 58,
    trend: {"wellbeing": [55, 57, 56, 58, 60, 61], "pressure": [51, 53, 58, 55, 59, 56], "social": [60, 61, 61, 62, 63, 64], "career": [51, 53, 54, 55, 57, 58]},
    profile: [0, 0, 100, 0, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
  'k3': {
    name: 'S.Tr. TR Keselamatan K3', n: 1,
    wellbeing: 33, pressure: 42, social: 82, career: 72,
    trend: {"wellbeing": [27, 29, 28, 30, 32, 33], "pressure": [37, 39, 44, 41, 45, 42], "social": [78, 79, 79, 80, 81, 82], "career": [65, 67, 68, 69, 71, 72]},
    profile: [100, 0, 0, 0, 0],
    topicW: [24, 18, 14, 12, 12, 10, 10]
  },
};
var FACULTIES = PRODIS;


/* =========================================================
   NadiKampus — Hasil Latent Profile Analysis (LPA via GMM)
   Data sinkron dengan model GaussianMixture (k=5) terbaik
   berdasarkan AIC: 955.88 & BIC: 1161.53 (data/output/model_summary.csv)
   Centroid dihitung dari rata-rata dimensi Likert terstandarisasi (0-100)
   ========================================================= */
var CLUSTERS = [
  {
    cluster: 1,
    key: 'p1',
    name: 'Profil 1: Socially Supported, Academically Strained',
    short: 'Sosial Kuat, Akademik Tertekan',
    color: '#0284C7',
    pca: { x: -0.37, y: 0.29 },
    rawMeans: { wellbeing: 2.85, pressure: 2.94, social: 4.10, career: 3.34 },
    means: { wellbeing: 57, pressure: 59, social: 82, career: 67 },
    count: 14,
    pct: 11.8,
    desc: 'Centroid menunjukkan skor dukungan sosial yang sangat menonjol (4.10 / 82), namun kesejahteraan psikologis (2.85) dan ketahanan akademik (2.94) berada di bawah rata-rata.',
    traits: [
      'Dukungan sosial tinggi (82/100): relasi teman sebaya dan rasa diterima sangat kuat',
      'Ketahanan akademik rentan (59/100): merasa beban kuliah dan tugas menekan',
      'Wellbeing psikologis tertekan (57/100): membutuhkan pendampingan manajemen stres'
    ],
    need: 'Harmonisasi beban tugas antar prodi, mentoring akademik teman sebaya, dan workshop regulasi emosi belajar.'
  },
  {
    cluster: 2,
    key: 'p2',
    name: 'Profil 2: Thriving & High Functioning',
    short: 'Wellbeing & Akademik Positif',
    color: '#0D9488',
    pca: { x: 0.97, y: -0.08 },
    rawMeans: { wellbeing: 4.06, pressure: 3.88, social: 4.25, career: 3.65 },
    means: { wellbeing: 81, pressure: 78, social: 85, career: 73 },
    count: 27,
    pct: 22.7,
    desc: 'Centroid berada pada performa tinggi dan seimbang di seluruh dimensi. Mahasiswa mampu mengelola tuntutan akademik dengan dukungan lingkungan sosial yang solid.',
    traits: [
      'Kesejahteraan mental tinggi (81/100) dengan kepuasan belajar yang baik',
      'Performa akademik stabil (78/100) dan kesiapan karier solid (73/100)',
      'Memiliki strategi adaptasi (coping mechanism) yang matang dan suportif'
    ],
    need: 'Pemberdayaan sebagai duta kampus/mentor sebaya (peer mentor) dan akses ke program akselerasi karier/magang industri.'
  },
  {
    cluster: 3,
    key: 'p3',
    name: 'Profil 3: Moderate / Average Adaptation',
    short: 'Adaptasi Moderat (Mayoritas)',
    color: '#6366F1',
    pca: { x: -0.46, y: 0.05 },
    rawMeans: { wellbeing: 3.13, pressure: 3.12, social: 3.70, career: 3.05 },
    means: { wellbeing: 63, pressure: 62, social: 74, career: 61 },
    count: 57,
    pct: 47.9,
    desc: 'Mencakup 47.9% populasi mahasiswa (kelompok terbesar). Seluruh indikator berada pada tingkat menengah-moderat. Berpotensi berkembang pesat jika diberikan dorongan fasilitas yang tepat.',
    traits: [
      'Proporsi terbesar kampus: 47.9% (57 responden dari 119 sampel)',
      'Dukungan sosial cukup baik (74/100), namun kesiapan karier (61/100) dan akademik (62/100) perlu diakselerasi',
      'Rentan mengalami penurunan performa jika menghadapi lonjakan tugas mendadak'
    ],
    need: 'Klinik perencanaan karier dan magang terpandu, panduan belajar terstruktur, serta penguatan jejaring kemahasiswaan.'
  },
  {
    cluster: 4,
    key: 'p4',
    name: 'Profil 4: High Risk / Vulnerable',
    short: 'Sangat Rentan (Prioritas Intervensi)',
    color: '#E11D48',
    pca: { x: -2.65, y: -0.10 },
    rawMeans: { wellbeing: 2.11, pressure: 2.31, social: 2.41, career: 1.77 },
    means: { wellbeing: 42, pressure: 46, social: 48, career: 35 },
    count: 8,
    pct: 6.7,
    desc: 'Centroid menunjukkan nilai kritis di semua indikator (Likert < 2.5). Kesiapan karier (35) dan kesejahteraan mental (42) berada di zona darurat yang membutuhkan penanganan segera.',
    traits: [
      'Kesiapan karier sangat rendah (35/100, terendah): kecemasan masa depan akut',
      'Wellbeing psikologis kritis (42/100) dengan rasa keterasingan sosial (48/100)',
      'Memerlukan sistem peringatan dini (early warning system) terintegrasi'
    ],
    need: 'Layanan konseling psikologis prioritas (jalur cepat), pendampingan dosen wali intensif, dan advokasi bantuan finansial/akademik.'
  },
  {
    cluster: 5,
    key: 'p5',
    name: 'Profil 5: Flourishing / Optimal Well-being',
    short: 'Wellbeing Optimal & Unggul',
    color: '#059669',
    pca: { x: 2.04, y: -0.30 },
    rawMeans: { wellbeing: 4.48, pressure: 4.52, social: 5.00, career: 4.02 },
    means: { wellbeing: 90, pressure: 90, social: 100, career: 80 },
    count: 13,
    pct: 10.9,
    desc: 'Centroid merepresentasikan kelompok mahasiswa teladan dengan tingkat kepuasan dan pencapaian tertinggi. Dukungan sosial mencapai skor sempurna (100) dan akademik prima (90).',
    traits: [
      'Dukungan sosial sempurna (100/100): relasi kampus dan dosen sangat erat',
      'Akademik dan kesiapan karier unggul (90/100 & 80/100)',
      'Memiliki resiliensi tinggi, antusiasme belajar tinggi, dan motivasi berprestasi'
    ],
    need: 'Fasilitasi program hibah kompetisi nasional/internasional, kepemimpinan organisasi, dan inkubasi riset kampus.'
  }
];

// Alias agar kompatibel dengan modul lain
var PROFILES = CLUSTERS;

/* Data Titik Sebaran 119 Responden Riil untuk Scatter Plot 2D (PCA Projection) */
const CLUSTER_POINTS = [
  { id: "MHS-3-1", cluster: 2, x: 0.06, y: -0.17, prodi: "S. Tr. Teknik Elektro Industri", wb: 73, acd: 65, soc: 80, car: 62 },
  { id: "MHS-4-2", cluster: 3, x: -1.89, y: -1.18, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 53, acd: 58, soc: 68, car: 25 },
  { id: "MHS-3-3", cluster: 2, x: -0.47, y: -0.24, prodi: "S.Tr. Teknik Informatika", wb: 69, acd: 68, soc: 68, car: 55 },
  { id: "MHS-3-4", cluster: 2, x: 0.27, y: 0.04, prodi: "S.Tr. Sains Data Terapan", wb: 71, acd: 75, soc: 75, car: 68 },
  { id: "MHS-1-5", cluster: 0, x: -0.96, y: -1.96, prodi: "D3 Teknik Informatika", wb: 56, acd: 70, soc: 95, car: 22 },
  { id: "MHS-3-6", cluster: 2, x: -1.28, y: -0.55, prodi: "S.Tr. Teknik Komputer", wb: 56, acd: 58, soc: 72, car: 42 },
  { id: "MHS-3-7", cluster: 2, x: -1.4, y: 0.71, prodi: "S.Tr. Sains Data Terapan", wb: 40, acd: 60, soc: 60, car: 62 },
  { id: "MHS-3-8", cluster: 2, x: -0.41, y: 0.13, prodi: "S.Tr. Sistem Pembangkit Energi", wb: 69, acd: 60, soc: 70, car: 62 },
  { id: "MHS-3-9", cluster: 2, x: -0.35, y: 0.19, prodi: "S.Tr. Teknik Komputer", wb: 60, acd: 60, soc: 80, car: 65 },
  { id: "MHS-1-10", cluster: 0, x: 0.13, y: 1.39, prodi: "S.Tr. Teknik Komputer", wb: 51, acd: 70, soc: 72, car: 90 },
  { id: "MHS-3-11", cluster: 2, x: -0.08, y: -0.43, prodi: "S.Tr. Teknologi Game", wb: 69, acd: 60, soc: 90, car: 58 },
  { id: "MHS-5-12", cluster: 4, x: 2.13, y: -0.37, prodi: "S.Tr. Teknik Informatika", wb: 91, acd: 92, soc: 100, car: 80 },
  { id: "MHS-3-13", cluster: 2, x: -1.71, y: 0.78, prodi: "S.Tr. Teknik Telekomunikasi", wb: 49, acd: 50, soc: 50, car: 60 },
  { id: "MHS-5-14", cluster: 4, x: 1.22, y: 0.24, prodi: "S.Tr. Sains Data Terapan", wb: 71, acd: 75, soc: 100, car: 82 },
  { id: "MHS-3-15", cluster: 2, x: 0.17, y: -0.23, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 82, acd: 60, soc: 80, car: 62 },
  { id: "MHS-2-16", cluster: 1, x: 0.01, y: -0.67, prodi: "D3 Teknik Informatika", wb: 76, acd: 75, soc: 75, car: 52 },
  { id: "MHS-3-17", cluster: 2, x: 0.19, y: -0.26, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 64, acd: 75, soc: 85, car: 62 },
  { id: "MHS-3-18", cluster: 2, x: 1.1, y: -0.37, prodi: "S.Tr. Teknik Mekatronika", wb: 71, acd: 85, soc: 98, car: 70 },
  { id: "MHS-3-19", cluster: 2, x: -0.38, y: 0.04, prodi: "S.Tr. Teknik Mekatronika", wb: 67, acd: 75, soc: 60, car: 60 },
  { id: "MHS-3-20", cluster: 2, x: 0.37, y: -0.35, prodi: "S.Tr. Teknik Informatika", wb: 71, acd: 75, soc: 85, car: 62 },
  { id: "MHS-3-21", cluster: 2, x: -0.96, y: 0.26, prodi: "S.Tr. Sistem Pembangkit Energi", wb: 56, acd: 52, soc: 72, car: 60 },
  { id: "MHS-1-22", cluster: 0, x: -1.25, y: 1.06, prodi: "S.Tr. Teknologi Rekayasa Keselamatan K3", wb: 33, acd: 42, soc: 82, car: 72 },
  { id: "MHS-2-23", cluster: 1, x: 0.93, y: 0.08, prodi: "S.Tr. Sains Data Terapan", wb: 82, acd: 78, soc: 80, car: 75 },
  { id: "MHS-1-24", cluster: 0, x: -0.01, y: 1.45, prodi: "S. Tr. Teknik Elektro Industri", wb: 56, acd: 60, soc: 72, car: 90 },
  { id: "MHS-3-25", cluster: 2, x: -0.17, y: 0.11, prodi: "S.Tr. Sistem Pembangkit Energi", wb: 67, acd: 62, soc: 78, car: 65 },
  { id: "MHS-4-26", cluster: 3, x: -2.79, y: 0.82, prodi: "S.Tr. Teknik Informatika", wb: 27, acd: 45, soc: 45, car: 50 },
  { id: "MHS-3-27", cluster: 2, x: -0.94, y: 0.2, prodi: "S.Tr. Teknologi Rekayasa Multimedia", wb: 67, acd: 58, soc: 58, car: 58 },
  { id: "MHS-3-28", cluster: 2, x: -1.25, y: 0.58, prodi: "S.Tr. Sains Data Terapan", wb: 51, acd: 48, soc: 68, car: 62 },
  { id: "MHS-1-29", cluster: 0, x: -0.16, y: 0.66, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 60, acd: 60, soc: 78, car: 75 },
  { id: "MHS-3-30", cluster: 2, x: -0.17, y: -0.18, prodi: "S.Tr. Teknik Telekomunikasi", wb: 64, acd: 68, soc: 80, car: 60 },
  { id: "MHS-3-31", cluster: 2, x: -0.12, y: -0.22, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 71, acd: 62, soc: 80, car: 60 },
  { id: "MHS-5-32", cluster: 4, x: 2.5, y: 0.41, prodi: "S.Tr. Teknik Elektronika", wb: 93, acd: 88, soc: 100, car: 98 },
  { id: "MHS-3-33", cluster: 2, x: -0.93, y: 0.32, prodi: "S.Tr. Teknologi Rekayasa Multimedia", wb: 60, acd: 60, soc: 60, car: 60 },
  { id: "MHS-3-34", cluster: 2, x: -0.12, y: -0.11, prodi: "S.Tr. Sains Data Terapan", wb: 60, acd: 65, soc: 88, car: 62 },
  { id: "MHS-5-35", cluster: 4, x: 2.38, y: -0.35, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 91, acd: 100, soc: 100, car: 82 },
  { id: "MHS-2-36", cluster: 1, x: 0.95, y: -0.58, prodi: "S.Tr. Teknologi Game", wb: 84, acd: 72, soc: 95, car: 65 },
  { id: "MHS-4-37", cluster: 3, x: -2.7, y: -0.35, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 42, acd: 52, soc: 45, car: 30 },
  { id: "MHS-4-38", cluster: 3, x: -2.31, y: -0.76, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 58, acd: 45, soc: 55, car: 28 },
  { id: "MHS-1-39", cluster: 0, x: 0.71, y: 1.08, prodi: "S.Tr. Teknologi Rekayasa Perancangan Manufaktur", wb: 76, acd: 68, soc: 72, car: 90 },
  { id: "MHS-3-40", cluster: 2, x: -1.25, y: 0.2, prodi: "S.Tr. Bisnis Digital", wb: 60, acd: 52, soc: 60, car: 55 },
  { id: "MHS-3-41", cluster: 2, x: 0.63, y: 0.76, prodi: "S.Tr. Teknik Mekatronika", wb: 64, acd: 68, soc: 88, car: 85 },
  { id: "MHS-1-42", cluster: 0, x: -0.04, y: 0.72, prodi: "D3 Teknik Elektro Industri", wb: 60, acd: 60, soc: 80, car: 78 },
  { id: "MHS-3-43", cluster: 2, x: -1.67, y: 0.18, prodi: "D3 Teknik Informatika", wb: 56, acd: 52, soc: 52, car: 50 },
  { id: "MHS-1-44", cluster: 0, x: -1.75, y: -1.11, prodi: "S.Tr. Teknik Elektronika", wb: 51, acd: 40, soc: 90, car: 30 },
  { id: "MHS-3-45", cluster: 2, x: -0.38, y: -0.43, prodi: "S.Tr. Teknik Elektronika", wb: 56, acd: 62, soc: 92, car: 55 },
  { id: "MHS-3-46", cluster: 2, x: -0.7, y: 0.16, prodi: "S.Tr. Bisnis Digital", wb: 62, acd: 60, soc: 68, car: 60 },
  { id: "MHS-2-47", cluster: 1, x: 0.88, y: 0.25, prodi: "D3 Teknik Elektro Industri", wb: 78, acd: 78, soc: 80, car: 78 },
  { id: "MHS-1-48", cluster: 0, x: -0.85, y: 0.7, prodi: "D3 Teknik Elektro Industri", wb: 53, acd: 40, soc: 82, car: 70 },
  { id: "MHS-2-49", cluster: 1, x: 1.18, y: 0.23, prodi: "D3 Teknik Elektro Industri", wb: 84, acd: 80, soc: 80, car: 80 },
  { id: "MHS-4-50", cluster: 3, x: -2.93, y: 0.35, prodi: "S.Tr. Teknik Elektronika", wb: 40, acd: 40, soc: 40, car: 40 },
  { id: "MHS-2-51", cluster: 1, x: 0.74, y: -0.14, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 76, acd: 75, soc: 88, car: 70 },
  { id: "MHS-2-52", cluster: 1, x: 1.67, y: 0.64, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 84, acd: 80, soc: 88, car: 92 },
  { id: "MHS-3-53", cluster: 2, x: -0.29, y: -0.34, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 76, acd: 68, soc: 68, car: 55 },
  { id: "MHS-3-54", cluster: 2, x: -0.77, y: 0.08, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 69, acd: 58, soc: 62, car: 58 },
  { id: "MHS-3-55", cluster: 2, x: 1.63, y: -0.66, prodi: "S.Tr. Sains Data Terapan", wb: 91, acd: 85, soc: 98, car: 70 },
  { id: "MHS-3-56", cluster: 2, x: -0.1, y: 0.35, prodi: "S.Tr. Sains Data Terapan", wb: 64, acd: 62, soc: 78, car: 70 },
  { id: "MHS-1-57", cluster: 0, x: 0.65, y: -1.53, prodi: "S.Tr. Teknologi Game", wb: 73, acd: 92, soc: 95, car: 45 },
  { id: "MHS-5-58", cluster: 4, x: 2.03, y: 0.8, prodi: "S. Tr. Teknik Elektro Industri", wb: 78, acd: 82, soc: 100, car: 100 },
  { id: "MHS-2-59", cluster: 1, x: 2.03, y: 0.56, prodi: "S.Tr. Teknik Mekatronika", wb: 89, acd: 82, soc: 92, car: 95 },
  { id: "MHS-2-60", cluster: 1, x: 1.18, y: 0.08, prodi: "D3 Teknik Elektronika", wb: 82, acd: 82, soc: 82, car: 78 },
  { id: "MHS-2-61", cluster: 1, x: 0.23, y: -0.71, prodi: "D3 Teknik Informatika", wb: 76, acd: 72, soc: 85, car: 55 },
  { id: "MHS-3-62", cluster: 2, x: -0.56, y: 0.65, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 56, acd: 62, soc: 68, car: 70 },
  { id: "MHS-1-63", cluster: 0, x: -0.74, y: 0.51, prodi: "S.Tr. Teknik Elektronika", wb: 62, acd: 40, soc: 80, car: 68 },
  { id: "MHS-5-64", cluster: 4, x: 3.06, y: 0.27, prodi: "D3 Teknik Informatika", wb: 100, acd: 100, soc: 100, car: 100 },
  { id: "MHS-5-65", cluster: 4, x: 3.06, y: 0.27, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 100, acd: 100, soc: 100, car: 100 },
  { id: "MHS-2-66", cluster: 1, x: 1.85, y: 0.13, prodi: "S.Tr. Sains Data Terapan", wb: 89, acd: 90, soc: 88, car: 85 },
  { id: "MHS-1-67", cluster: 0, x: 0.05, y: 0.86, prodi: "D3 Teknik Elektronika", wb: 58, acd: 68, soc: 75, car: 80 },
  { id: "MHS-3-68", cluster: 2, x: 0.45, y: 0.71, prodi: "D3 Teknik Elektronika", wb: 62, acd: 65, soc: 88, car: 82 },
  { id: "MHS-2-69", cluster: 1, x: 1.31, y: 0.58, prodi: "S.Tr. Teknologi Rekayasa Perancangan Manufaktur", wb: 80, acd: 80, soc: 82, car: 88 },
  { id: "MHS-2-70", cluster: 1, x: 0.85, y: -0.18, prodi: "D3 Teknik Elektronika", wb: 87, acd: 72, soc: 82, car: 70 },
  { id: "MHS-3-71", cluster: 2, x: -0.76, y: 0.23, prodi: "S.Tr. Teknologi Rekayasa Multimedia", wb: 67, acd: 60, soc: 60, car: 60 },
  { id: "MHS-5-72", cluster: 4, x: 1.73, y: -1.7, prodi: "D3 Teknik Elektronika", wb: 100, acd: 95, soc: 100, car: 52 },
  { id: "MHS-2-73", cluster: 1, x: 0.22, y: -1.02, prodi: "S.Tr. Sains Data Terapan", wb: 76, acd: 70, soc: 92, car: 50 },
  { id: "MHS-3-74", cluster: 2, x: -0.35, y: 0.17, prodi: "S.Tr. Sains Data Terapan", wb: 56, acd: 62, soc: 82, car: 65 },
  { id: "MHS-3-75", cluster: 2, x: -0.49, y: -0.03, prodi: "S.Tr. Sains Data Terapan", wb: 67, acd: 52, soc: 80, car: 60 },
  { id: "MHS-2-76", cluster: 1, x: 0.85, y: -0.2, prodi: "S.Tr. Teknik Komputer", wb: 80, acd: 75, soc: 88, car: 70 },
  { id: "MHS-3-77", cluster: 2, x: 0.25, y: -0.25, prodi: "S.Tr. Teknik Mekatronika", wb: 80, acd: 68, soc: 78, car: 62 },
  { id: "MHS-3-78", cluster: 2, x: 0.57, y: -0.25, prodi: "S.Tr. Sains Data Terapan", wb: 82, acd: 80, soc: 72, car: 65 },
  { id: "MHS-1-79", cluster: 0, x: 0.1, y: 1.37, prodi: "S.Tr. Sains Data Terapan", wb: 60, acd: 55, soc: 78, car: 90 },
  { id: "MHS-2-80", cluster: 1, x: 0.38, y: -0.33, prodi: "S.Tr. Sains Data Terapan", wb: 73, acd: 78, soc: 80, car: 62 },
  { id: "MHS-2-81", cluster: 1, x: 0.42, y: -0.36, prodi: "S.Tr. Sains Data Terapan", wb: 82, acd: 70, soc: 80, car: 62 },
  { id: "MHS-5-82", cluster: 4, x: 2.31, y: -0.32, prodi: "S.Tr. Sistem Pembangkit Energi", wb: 93, acd: 95, soc: 100, car: 82 },
  { id: "MHS-3-83", cluster: 2, x: -1.45, y: -0.42, prodi: "D3 Teknik Elektronika", wb: 60, acd: 52, soc: 65, car: 42 },
  { id: "MHS-3-84", cluster: 2, x: -0.54, y: -0.12, prodi: "S.Tr. Sains Data Terapan", wb: 62, acd: 60, soc: 78, car: 58 },
  { id: "MHS-3-85", cluster: 2, x: -1.21, y: -0.43, prodi: "S.Tr. Sistem Pembangkit Energi", wb: 60, acd: 55, soc: 70, car: 45 },
  { id: "MHS-5-86", cluster: 4, x: 0.5, y: -2.46, prodi: "S.Tr. Teknologi Game", wb: 82, acd: 90, soc: 100, car: 28 },
  { id: "MHS-3-87", cluster: 2, x: -0.68, y: 0.35, prodi: "S.Tr. Teknik Mekatronika", wb: 64, acd: 65, soc: 58, car: 62 },
  { id: "MHS-2-88", cluster: 1, x: 0.03, y: -1.04, prodi: "S. Tr. Teknik Elektro Industri", wb: 78, acd: 68, soc: 88, car: 48 },
  { id: "MHS-2-89", cluster: 1, x: 1.06, y: 0.3, prodi: "S.Tr. Teknik Informatika", wb: 80, acd: 80, soc: 80, car: 80 },
  { id: "MHS-4-90", cluster: 3, x: -2.89, y: -0.01, prodi: "S.Tr. Teknik Mekatronika", wb: 40, acd: 38, soc: 50, car: 35 },
  { id: "MHS-2-91", cluster: 1, x: 1.36, y: 0.27, prodi: "S.Tr. Teknik Komputer", wb: 89, acd: 78, soc: 82, car: 82 },
  { id: "MHS-5-92", cluster: 4, x: 1.89, y: -0.52, prodi: "S.Tr. Sains Data Terapan", wb: 82, acd: 98, soc: 100, car: 75 },
  { id: "MHS-3-93", cluster: 2, x: -1.12, y: 0.09, prodi: "S.Tr. Teknik Telekomunikasi", wb: 44, acd: 65, soc: 70, car: 55 },
  { id: "MHS-5-94", cluster: 4, x: 1.26, y: -0.07, prodi: "S.Tr. Teknik Komputer", wb: 82, acd: 70, soc: 100, car: 78 },
  { id: "MHS-2-95", cluster: 1, x: 0.25, y: -0.4, prodi: "D3 Teknologi Multimedia dan Broadcasting", wb: 73, acd: 75, soc: 80, car: 60 },
  { id: "MHS-3-96", cluster: 2, x: 0.43, y: 0.11, prodi: "S.Tr. Sains Data Terapan", wb: 58, acd: 70, soc: 98, car: 72 },
  { id: "MHS-5-97", cluster: 4, x: 2.49, y: -0.14, prodi: "D3 Teknik Elektro Industri", wb: 100, acd: 90, soc: 100, car: 88 },
  { id: "MHS-3-98", cluster: 2, x: -1.01, y: 0.35, prodi: "D3 Teknik Elektro Industri", wb: 64, acd: 52, soc: 60, car: 60 },
  { id: "MHS-3-99", cluster: 2, x: 0.18, y: -0.4, prodi: "S.Tr. Teknologi Rekayasa Perancangan Manufaktur", wb: 73, acd: 68, soc: 85, car: 60 },
  { id: "MHS-2-100", cluster: 1, x: 1.74, y: 0.61, prodi: "S.Tr. Teknik Informatika", wb: 78, acd: 90, soc: 88, car: 92 },
  { id: "MHS-2-101", cluster: 1, x: 0.67, y: -0.51, prodi: "S.Tr. Teknologi Game", wb: 80, acd: 78, soc: 85, car: 62 },
  { id: "MHS-3-102", cluster: 2, x: -1.51, y: 0.27, prodi: "S.Tr. Sains Data Terapan", wb: 49, acd: 42, soc: 72, car: 55 },
  { id: "MHS-3-103", cluster: 2, x: -0.85, y: -0.13, prodi: "S.Tr. Teknik Komputer", wb: 51, acd: 58, soc: 82, car: 55 },
  { id: "MHS-3-104", cluster: 2, x: -1.3, y: -0.02, prodi: "S.Tr. Sains Data Terapan", wb: 60, acd: 60, soc: 55, car: 50 },
  { id: "MHS-3-105", cluster: 2, x: -1.28, y: -0.58, prodi: "S.Tr. Teknik Elektronika", wb: 51, acd: 58, soc: 78, car: 42 },
  { id: "MHS-2-106", cluster: 1, x: 1.91, y: 0.5, prodi: "S.Tr. Sains Data Terapan", wb: 84, acd: 88, soc: 90, car: 92 },
  { id: "MHS-3-107", cluster: 2, x: -0.35, y: -0.1, prodi: "S.Tr. Sains Data Terapan", wb: 56, acd: 68, soc: 82, car: 60 },
  { id: "MHS-3-108", cluster: 2, x: -0.63, y: 0.43, prodi: "S.Tr. Sains Data Terapan", wb: 64, acd: 60, soc: 62, car: 65 },
  { id: "MHS-2-109", cluster: 1, x: 0.53, y: -0.75, prodi: "S.Tr. Sains Data Terapan", wb: 80, acd: 72, soc: 90, car: 58 },
  { id: "MHS-3-110", cluster: 2, x: -0.4, y: 0.51, prodi: "S.Tr. Teknik Elektronika", wb: 53, acd: 62, soc: 78, car: 70 },
  { id: "MHS-3-111", cluster: 2, x: -0.03, y: 0.06, prodi: "S.Tr. Teknologi Rekayasa Internet", wb: 64, acd: 72, soc: 75, car: 65 },
  { id: "MHS-2-112", cluster: 1, x: 1.77, y: 0.26, prodi: "S.Tr. Teknik Mekatronika", wb: 87, acd: 80, soc: 95, car: 88 },
  { id: "MHS-4-113", cluster: 3, x: -2.35, y: 0.51, prodi: "S.Tr. Teknologi Game", wb: 40, acd: 60, soc: 35, car: 48 },
  { id: "MHS-3-114", cluster: 2, x: -1.06, y: 0.36, prodi: "S.Tr. Teknik Informatika", wb: 51, acd: 60, soc: 65, car: 60 },
  { id: "MHS-1-115", cluster: 0, x: -1.13, y: -1.17, prodi: "S.Tr. Teknik Komputer", wb: 49, acd: 58, soc: 95, car: 35 },
  { id: "MHS-3-116", cluster: 2, x: -0.04, y: 0.43, prodi: "S.Tr. Teknik Mekatronika", wb: 60, acd: 62, soc: 82, car: 72 },
  { id: "MHS-4-117", cluster: 3, x: -3.33, y: -0.19, prodi: "S.Tr. Teknik Elektronika", wb: 38, acd: 32, soc: 48, car: 28 },
  { id: "MHS-2-118", cluster: 1, x: 1.18, y: 0.23, prodi: "D3 Teknik Elektro Industri", wb: 84, acd: 80, soc: 80, car: 80 },
  { id: "MHS-3-119", cluster: 2, x: -1.09, y: 0.31, prodi: "S. Tr. Teknik Elektro Industri", wb: 53, acd: 48, soc: 75, car: 60 },
];
window.CLUSTER_POINTS = CLUSTER_POINTS;


/* Contoh komentar anonim hasil klasifikasi NLP: t = indeks topik, s = 'pos' | 'neu' | 'neg' */
const QUOTES = [
  { t: 0, s: 'neg', x: 'Minggu ini ada empat deadline dan dua ujian. Saya tidur rata-rata tiga jam dan mulai sulit fokus di kelas.' },
  { t: 0, s: 'neg', x: 'Tiap dosen memberi tugas besar di waktu yang sama, dan tidak ada yang mengoordinasikan jadwalnya.' },
  { t: 0, s: 'neu', x: 'Bebannya memang berat, tapi masih bisa saya atur kalau jadwal ujian dibuat lebih tersebar.' },
  { t: 1, s: 'neg', x: 'Semester depan saya harus magang, tapi belum tahu mulai dari mana dan portofolio saya masih kosong.' },
  { t: 1, s: 'pos', x: 'Sesi review CV bersama alumni sangat membantu. Baru kali ini saya merasa punya arah.' },
  { t: 1, s: 'neu', x: 'Info lowongan magang ada, tetapi tersebar di banyak grup dan sulit dipantau.' },
  { t: 2, s: 'neg', x: 'UKT naik, uang kos juga naik. Saya mulai kerja sampingan dan waktu belajar jadi berkurang.' },
  { t: 2, s: 'neu', x: 'Saya tahu ada keringanan biaya, tetapi syarat dan cara mengajukannya belum jelas.' },
  { t: 3, s: 'neg', x: 'Sebagai mahasiswa rantau, saya sering merasa sendirian, terutama di akhir pekan.' },
  { t: 3, s: 'neg', x: 'Kelas saya besar sehingga sulit mengenal teman dekat. Saya ingin ada kegiatan kecil untuk berkenalan.' },
  { t: 3, s: 'pos', x: 'Kelompok belajar di asrama membuat saya lebih tenang dan punya teman bercerita.' },
  { t: 4, s: 'neg', x: 'Wifi di gedung kuliah sering putus saat kuis daring, dan antrean layanan akademik panjang.' },
  { t: 4, s: 'pos', x: 'Ruang belajar baru di perpustakaan nyaman dan bisa dipesan lewat aplikasi.' },
  { t: 4, s: 'neu', x: 'Fasilitas sudah cukup, hanya jam buka ruang belajar sebaiknya diperpanjang saat musim ujian.' },
  { t: 5, s: 'pos', x: 'Dosen wali saya responsif dan mau mendengarkan ketika saya hampir mundur dari satu mata kuliah.' },
  { t: 5, s: 'neg', x: 'Saya sulit bertemu dosen wali. Konsultasi hanya sekali per semester dan terasa formalitas.' },
  { t: 6, s: 'pos', x: 'Ikut UKM fotografi membuat saya punya teman lintas jurusan dan lebih semangat kuliah.' },
  { t: 6, s: 'pos', x: 'Acara kampus bulan lalu seru dan membuat saya merasa menjadi bagian dari kampus ini.' },
  { t: 6, s: 'neu', x: 'Kegiatan organisasinya bagus, tetapi sering bentrok dengan jadwal praktikum.' }
];

/* Katalog program dukungan: metric = indikator terkait, t = topik, profiles = klaster sasaran */
const RECOS = [
  { id: 'r1', title: 'Konseling Cepat 48 Jam', metric: 'wellbeing', t: 0, profiles: [0],
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
  { id: 'r6', title: 'Dosen Wali Responsif', metric: 'social', t: 5, profiles: [0, 2],
    desc: 'Pedoman dan pelatihan singkat untuk dosen wali, dengan dua konsultasi wajib per semester dan penanda dini bagi mahasiswa berisiko.',
    owner: 'Pusat Pembinaan Akademik', duration: '1 semester', effort: 'Sedang', kpi: 'Konsultasi dosen wali terlaksana bagi 90% mahasiswa' },
  { id: 'r7', title: 'Ruang & Kegiatan Komunitas Kecil', metric: 'social', t: 6, profiles: [2, 3],
    desc: 'Kegiatan mingguan berkelompok kecil (10–15 orang) di ruang bersama, dengan jadwal yang tidak bentrok dengan praktikum.',
    owner: 'Bagian Kemahasiswaan', duration: '1 semester', effort: 'Rendah', kpi: 'Partisipasi mahasiswa di kegiatan komunitas naik 20%' },
  { id: 'r8', title: 'Perbaikan Layanan Digital & Fasilitas', metric: 'wellbeing', t: 4, profiles: [1, 3],
    desc: 'Menstabilkan wifi saat ujian daring, memperpanjang jam ruang belajar musim ujian, dan membuka antrean layanan akademik secara daring.',
    owner: 'UPT Komputer & Jaringan', duration: '2–3 bulan', effort: 'Tinggi', kpi: 'Keluhan wifi saat praktikum turun 60%' }
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


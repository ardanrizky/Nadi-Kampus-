/* =========================================================
   NadiKampus — Data Ilustrasi & Hasil K-Means Clustering
   Semua angka di file ini adalah data terstruktur untuk demo.
   ========================================================= */

/* Empat indikator utama (Dimensi Pengukuran) */
var DIMS = [
  { key: 'wellbeing', label: 'Wellbeing Index',   short: 'Wellbeing',        color: '#059669', good: 'high',
    about: 'Gabungan kesejahteraan psikologis, kepuasan hidup, dan kondisi emosi mahasiswa dalam sebulan terakhir.' },
  { key: 'pressure',  label: 'Academic Pressure', short: 'Tekanan akademik', color: '#E0664A', good: 'low',
    about: 'Beban tugas, tekanan ujian, dan kekhawatiran akan capaian akademik. Skor tinggi berarti tekanan tinggi.' },
  { key: 'social',    label: 'Social Support',    short: 'Dukungan sosial',  color: '#2B65B0', good: 'high',
    about: 'Rasa terhubung dengan teman, dosen, dan komunitas kampus, serta ketersediaan orang untuk berbagi cerita.' },
  { key: 'career',    label: 'Career Readiness',  short: 'Kesiapan karier',  color: '#D9971E', good: 'high',
    about: 'Kejelasan arah karier, kepercayaan diri terhadap keterampilan, dan akses ke magang atau informasi kerja.' }
];

var MONTHS = ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'];

/* Selisih tiap bulan terhadap nilai terkini (bulan terakhir = 0) */
var TREND_OFFSETS = {
  wellbeing: [-6, -4, -5, -3, -1, 0],
  pressure:  [ 5,  6,  4,  4,  2, 0],
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

/* Data per fakultas. topicW = bobot komentar topik, profile = porsi 4 cluster (jumlah 100) */
var FACULTIES = {
  teknik:      { name: 'Teknik',              n: 612, wellbeing: 64, pressure: 76, social: 62, career: 60,
                 profile: [32, 22, 16, 30], topicW: [28, 16, 10, 10, 14, 10, 12] },
  ekonomi:     { name: 'Ekonomi & Bisnis',    n: 498, wellbeing: 68, pressure: 66, social: 66, career: 64,
                 profile: [20, 24, 18, 38], topicW: [18, 20, 14, 12, 12, 10, 14] },
  kedokteran:  { name: 'Kedokteran',          n: 356, wellbeing: 58, pressure: 84, social: 60, career: 66,
                 profile: [44, 14, 16, 26], topicW: [34, 10, 12, 14, 10, 10, 10] },
  hukum:       { name: 'Hukum',               n: 287, wellbeing: 63, pressure: 72, social: 61, career: 58,
                 profile: [30, 26, 16, 28], topicW: [26, 16, 10, 12, 12, 10, 14] },
  sains:       { name: 'Sains & Matematika',  n: 401, wellbeing: 67, pressure: 68, social: 64, career: 56,
                 profile: [22, 30, 18, 30], topicW: [22, 16, 10, 14, 14, 12, 12] },
  humaniora:   { name: 'Humaniora',           n: 327, wellbeing: 70, pressure: 58, social: 69, career: 52,
                 profile: [14, 30, 22, 34], topicW: [14, 18, 14, 16, 14, 12, 12] }
};

/* =========================================================
   Hasil K-Means Clustering (k=4)
   Centroid dihitung pada 4 dimensi terstandarisasi (0-100)
   ========================================================= */
var CLUSTERS = [
  {
    cluster: 1,
    key: 'ap',
    name: 'Cluster 1: Academic Pressure',
    short: 'Tekanan Akademik',
    color: '#E0664A',
    pca: { x: -2.4, y: 1.8 },
    means: { wellbeing: 48, pressure: 82, social: 55, career: 52 },
    desc: 'Centroid didominasi oleh skor Academic Pressure yang sangat tinggi. Kesejahteraan psikologis menurun drastis saat ujian dan deadline menumpuk.',
    traits: [
      'Centroid tekanan akademik: 82 (tertinggi dari seluruh cluster)',
      'Wellbeing rendah (48), risiko burnout dan gangguan tidur tinggi',
      'Keluhan utama: penumpukan tugas serentak dan ujian praktikum'
    ],
    need: 'Konseling psikologis jalur cepat dan harmonisasi kalender tugas lintas prodi.'
  },
  {
    cluster: 2,
    key: 'cc',
    name: 'Cluster 2: Career Concern',
    short: 'Kecemasan Karier',
    color: '#D9971E',
    pca: { x: 1.1, y: -2.2 },
    means: { wellbeing: 52, pressure: 58, social: 60, career: 34 },
    desc: 'Centroid menunjukkan performa akademik cukup baik, namun Career Readiness sangat rendah. Didominasi mahasiswa tingkat menengah & akhir yang cemas magang.',
    traits: [
      'Centroid kesiapan karier: 34 (paling rendah antar cluster)',
      'Tekanan akademik tergolong sedang (58)',
      'Banyak menyebut portofolio, CV, pencarian tempat magang, dan bekal kerja'
    ],
    need: 'Klinik portofolio, program magang terpandu, dan mentoring alumni lintas bidang.'
  },
  {
    cluster: 3,
    key: 'sa',
    name: 'Cluster 3: Social Adaptation',
    short: 'Adaptasi Sosial',
    color: '#2B65B0',
    pca: { x: -0.7, y: -1.0 },
    means: { wellbeing: 50, pressure: 50, social: 32, career: 60 },
    desc: 'Centroid Social Support sangat rendah (32). Mahasiswa merasa terisolasi, kesepian, dan kesulitan membangun jejaring pertemanan di kampus.',
    traits: [
      'Centroid dukungan sosial: 32 (sangat rendah)',
      'Umum pada mahasiswa rantau dan angkatan baru tahun pertama',
      'Komentar menonjolkan rasa kesepian di akhir pekan dan kelas berukuran besar'
    ],
    need: 'Program kakak asuh (buddy system) dan ruang komunitas minat kecil yang inklusif.'
  },
  {
    cluster: 4,
    key: 'bw',
    name: 'Cluster 4: Balanced Wellbeing',
    short: 'Wellbeing Seimbang',
    color: '#059669',
    pca: { x: 2.3, y: 1.4 },
    means: { wellbeing: 80, pressure: 35, social: 78, career: 74 },
    desc: 'Centroid berada pada spektrum ideal di seluruh dimensi. Tekanan akademik terkontrol dengan dukungan sosial dan kesiapan karier yang solid.',
    traits: [
      'Wellbeing (80) dan dukungan sosial (78) sangat tinggi',
      'Tekanan akademik terkelola baik (35)',
      'Aktif berorganisasi, memiliki coping mechanism sehat dan mentor sebaya'
    ],
    need: 'Dilibatkan aktif sebagai mentor sebaya (peer counseling) dan duta wellbeing kampus.'
  }
];

// Alias agar kompatibel dengan modul lain
var PROFILES = CLUSTERS;

/* Data Titik Sebaran Sampel Mahasiswa untuk Scatter Plot 2D (PCA Projection) */
const CLUSTER_POINTS = (() => {
  const points = [];
  let seed = 42;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const randNorm = (m, s) => {
    const u = rnd(), v = rnd();
    return m + s * Math.sqrt(-2.0 * Math.log(u || 0.001)) * Math.cos(2.0 * Math.PI * v);
  };

  const counts = [55, 45, 38, 62]; // proporsi sebaran titik sampel (total 200 mahasiswa)
  CLUSTERS.forEach((c, ci) => {
    for (let i = 0; i < counts[ci]; i++) {
      points.push({
        id: `MHS-${ci + 1}-${i + 1}`,
        cluster: ci,
        x: Number(randNorm(c.pca.x, 0.72).toFixed(2)),
        y: Number(randNorm(c.pca.y, 0.68).toFixed(2)),
        fac: ['teknik', 'ekonomi', 'kedokteran', 'hukum', 'sains', 'humaniora'][Math.floor(rnd() * 6)]
      });
    }
  });
  return points;
})();

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
    owner: 'Wakil Dekan Akademik', duration: '1 semester', effort: 'Rendah', kpi: 'Minggu dengan 3 penilaian besar atau lebih turun 50%' },
  { id: 'r3', title: 'Career Lab & Magang Terpandu', metric: 'career', t: 1, profiles: [1],
    desc: 'Klinik CV, simulasi wawancara, dan pemetaan lowongan magang dengan mentor alumni untuk mahasiswa semester 5 ke atas.',
    owner: 'Pusat Karier', duration: '1–2 semester', effort: 'Sedang', kpi: 'Mahasiswa dengan portofolio siap magang naik 30%' },
  { id: 'r4', title: 'Konseling Keuangan & Beasiswa Darurat', metric: 'wellbeing', t: 2, profiles: [0, 1],
    desc: 'Satu pintu untuk keringanan UKT dan beasiswa darurat, dengan syarat dan alur yang dipublikasikan jelas.',
    owner: 'Biro Kemahasiswaan', duration: '2 bulan persiapan', effort: 'Tinggi', kpi: 'Proses keringanan selesai dalam 14 hari' },
  { id: 'r5', title: 'Buddy Program Mahasiswa Baru', metric: 'social', t: 3, profiles: [2],
    desc: 'Mahasiswa baru dan rantau dipasangkan dengan kakak tingkat dalam kelompok kecil selama satu semester pertama.',
    owner: 'Biro Kemahasiswaan & BEM', duration: '1 semester', effort: 'Rendah', kpi: 'Skor dukungan sosial angkatan baru naik 8 poin' },
  { id: 'r6', title: 'Dosen Wali Responsif', metric: 'social', t: 5, profiles: [0, 2],
    desc: 'Pedoman dan pelatihan singkat untuk dosen wali, dengan dua konsultasi wajib per semester dan penanda dini bagi mahasiswa berisiko.',
    owner: 'Pusat Pengembangan Pendidikan', duration: '1 semester', effort: 'Sedang', kpi: 'Konsultasi dosen wali terlaksana bagi 90% mahasiswa' },
  { id: 'r7', title: 'Ruang & Kegiatan Komunitas Kecil', metric: 'social', t: 6, profiles: [2, 3],
    desc: 'Kegiatan mingguan berkelompok kecil (10–15 orang) di ruang bersama, dengan jadwal yang tidak bentrok dengan praktikum.',
    owner: 'Biro Kemahasiswaan', duration: '1 semester', effort: 'Rendah', kpi: 'Partisipasi mahasiswa di kegiatan komunitas naik 20%' },
  { id: 'r8', title: 'Perbaikan Layanan Digital & Fasilitas', metric: 'wellbeing', t: 4, profiles: [1, 3],
    desc: 'Menstabilkan wifi saat ujian daring, memperpanjang jam ruang belajar musim ujian, dan membuka antrean layanan akademik secara daring.',
    owner: 'Biro Sarana & Teknologi Informasi', duration: '2–3 bulan', effort: 'Tinggi', kpi: 'Keluhan wifi saat ujian daring turun 60%' }
];

/* Pasang eksplisit ke objek window global */
window.DIMS = DIMS;
window.MONTHS = MONTHS;
window.TREND_OFFSETS = TREND_OFFSETS;
window.TOPICS = TOPICS;
window.FACULTIES = FACULTIES;
window.CLUSTERS = CLUSTERS;
window.PROFILES = CLUSTERS;
window.CLUSTER_POINTS = CLUSTER_POINTS;
window.QUOTES = QUOTES;
window.RECOS = RECOS;


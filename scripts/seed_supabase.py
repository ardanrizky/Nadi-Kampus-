"""
Seed script: Mengunggah 19 komentar kuesioner survei historis ke tabel student_voice di Supabase.
"""
import urllib.request
import json

SUPABASE_URL = "https://xmabdgvmsljwzrffwvng.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww"

QUOTES = [
    {"topic_index": 0, "sentiment": "neg", "topic_name": "Beban tugas & ujian", "prodi": "D3 Teknik Informatika", "semester": 3, "text": "Minggu ini ada empat deadline dan dua ujian. Saya tidur rata-rata tiga jam dan mulai sulit fokus di kelas."},
    {"topic_index": 0, "sentiment": "neg", "topic_name": "Beban tugas & ujian", "prodi": "S.Tr. Teknik Informatika", "semester": 5, "text": "Tiap dosen memberi tugas besar di waktu yang sama, dan tidak ada yang mengoordinasikan jadwalnya."},
    {"topic_index": 0, "sentiment": "neu", "topic_name": "Beban tugas & ujian", "prodi": "S.Tr. Sains Data Terapan", "semester": 5, "text": "Bebannya memang berat, tapi masih bisa saya atur kalau jadwal ujian dibuat lebih tersebar."},
    {"topic_index": 1, "sentiment": "neg", "topic_name": "Kecemasan karier & magang", "prodi": "S.Tr. Teknik Komputer", "semester": 5, "text": "Semester depan saya harus magang, tapi belum tahu mulai dari mana dan portofolio saya masih kosong."},
    {"topic_index": 1, "sentiment": "pos", "topic_name": "Kecemasan karier & magang", "prodi": "S.Tr. Teknologi Game", "semester": 5, "text": "Sesi review CV bersama alumni sangat membantu. Baru kali ini saya merasa punya arah."},
    {"topic_index": 1, "sentiment": "neu", "topic_name": "Kecemasan karier & magang", "prodi": "S.Tr. Sains Data Terapan", "semester": 5, "text": "Info lowongan magang ada, tetapi tersebar di banyak grup dan sulit dipantau."},
    {"topic_index": 2, "sentiment": "neg", "topic_name": "Biaya kuliah & keuangan", "prodi": "D3 Teknik Elektro Industri", "semester": 3, "text": "UKT naik, uang kos juga naik. Saya mulai kerja sampingan dan waktu belajar jadi berkurang."},
    {"topic_index": 2, "sentiment": "neu", "topic_name": "Biaya kuliah & keuangan", "prodi": "S.Tr. Teknik Telekomunikasi", "semester": 3, "text": "Saya tahu ada keringanan biaya, tetapi syarat dan cara mengajukannya belum jelas."},
    {"topic_index": 3, "sentiment": "neg", "topic_name": "Kesepian & adaptasi sosial", "prodi": "S.Tr. Teknologi Rekayasa Internet", "semester": 1, "text": "Sebagai mahasiswa rantau, saya sering merasa sendirian, terutama di akhir pekan."},
    {"topic_index": 3, "sentiment": "neg", "topic_name": "Kesepian & adaptasi sosial", "prodi": "D3 Manajemen Informatika", "semester": 1, "text": "Kelas saya besar sehingga sulit mengenal teman dekat. Saya ingin ada kegiatan kecil untuk berkenalan."},
    {"topic_index": 3, "sentiment": "pos", "topic_name": "Kesepian & adaptasi sosial", "prodi": "S.Tr. Sains Data Terapan", "semester": 1, "text": "Kelompok belajar di asrama membuat saya lebih tenang dan punya teman bercerita."},
    {"topic_index": 4, "sentiment": "neg", "topic_name": "Layanan kampus & fasilitas", "prodi": "S.Tr. Teknik Komputer", "semester": 3, "text": "Wifi di gedung kuliah sering putus saat kuis daring, dan antrean layanan akademik panjang."},
    {"topic_index": 4, "sentiment": "pos", "topic_name": "Layanan kampus & fasilitas", "prodi": "D3 Teknologi Multimedia & Broadcasting", "semester": 3, "text": "Ruang belajar baru di perpustakaan nyaman dan bisa dipesan lewat aplikasi."},
    {"topic_index": 4, "sentiment": "neu", "topic_name": "Layanan kampus & fasilitas", "prodi": "S.Tr. Teknik Mekatronika", "semester": 5, "text": "Fasilitas sudah cukup, hanya jam buka ruang belajar sebaiknya diperpanjang saat musim ujian."},
    {"topic_index": 5, "sentiment": "pos", "topic_name": "Dukungan dosen & dosen wali", "prodi": "S.Tr. Sains Data Terapan", "semester": 3, "text": "Dosen wali saya responsif dan mau mendengarkan ketika saya hampir mundur dari satu mata kuliah."},
    {"topic_index": 5, "sentiment": "neg", "topic_name": "Dukungan dosen & dosen wali", "prodi": "S.Tr. Teknik Elektronika", "semester": 5, "text": "Saya sulit bertemu dosen wali. Konsultasi hanya sekali per semester dan terasa formalitas."},
    {"topic_index": 6, "sentiment": "pos", "topic_name": "Kegiatan & komunitas", "prodi": "D3 Teknologi Multimedia & Broadcasting", "semester": 3, "text": "Ikut UKM fotografi membuat saya punya teman lintas jurusan dan lebih semangat kuliah."},
    {"topic_index": 6, "sentiment": "pos", "topic_name": "Kegiatan & komunitas", "prodi": "S.Tr. Teknik Komputer", "semester": 3, "text": "Acara kampus bulan lalu seru dan membuat saya merasa menjadi bagian dari kampus ini."},
    {"topic_index": 6, "sentiment": "neu", "topic_name": "Kegiatan & komunitas", "prodi": "S.Tr. Teknik Informatika", "semester": 5, "text": "Kegiatan organisasinya bagus, tetapi sering bentrok dengan jadwal praktikum."}
]

url = f"{SUPABASE_URL}/rest/v1/student_voice"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 1. Hapus record dummy test
del_req = urllib.request.Request(
    f"{url}?text=like.*Testing%20integrasi*",
    headers=headers,
    method="DELETE"
)
try:
    urllib.request.urlopen(del_req)
except Exception as e:
    pass

# 2. Upload batch quotes
req = urllib.request.Request(
    url,
    data=json.dumps(QUOTES).encode("utf-8"),
    headers=headers,
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        print(f"[OK] Berhasil memasukkan {len(QUOTES)} komentar survei historis ke Supabase (Status: {resp.status})")
except urllib.error.HTTPError as err:
    print(f"[ERROR] HTTP Error: {err.code} - {err.read().decode('utf-8')}")

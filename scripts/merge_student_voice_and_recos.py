import json
import re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SENTIMENT_PATH = ROOT / "data" / "outputs_teks" / "nadikampus_sentiment.parquet"
TOPICS_PATH = ROOT / "data" / "outputs_teks" / "nadikampus_topics.parquet"

print("Memuat dataset sentimen & topik...")
sentiment_df = pd.read_parquet(SENTIMENT_PATH)
topics_df = pd.read_parquet(TOPICS_PATH)

# Merge topic and sentiment
merged_df = topics_df.merge(sentiment_df[['doc_id', 'sentiment', 'sentiment_low_conf']], on='doc_id', how='inner')

# 1. Ambil 30 sampel komentar Menfess Telegram yang berkualitas
tele_df = merged_df[(merged_df['source'] == 'telegram') & (merged_df['sentiment_low_conf'] == False)].copy()

# Filter teks yang layak (panjang 35 - 280 karakter)
tele_df = tele_df[tele_df['text_clean'].str.len().between(35, 280)]

# Distribusi sentimen Telegram
tele_neg = tele_df[tele_df['sentiment'] == 'negative'].sample(n=14, random_state=42)
tele_pos = tele_df[tele_df['sentiment'] == 'positive'].sample(n=8, random_state=42)
tele_neu = tele_df[tele_df['sentiment'] == 'neutral'].sample(n=8, random_state=42)
tele_sample = pd.concat([tele_neg, tele_pos, tele_neu]).sample(frac=1, random_state=42)

tele_quotes = []
for _, row in tele_sample.iterrows():
    s_label = 'neg' if row['sentiment'] == 'negative' else ('pos' if row['sentiment'] == 'positive' else 'neu')
    t_id = int(row['topic']) if pd.notnull(row['topic']) and 0 <= int(row['topic']) <= 4 else 0
    tele_quotes.append({
        't': t_id,
        's': s_label,
        'source': 'telegram',
        'x': row['text_clean'].strip()
    })

# 2. Ambil 30 komentar GForm dari data.js yang sudah ada
with open(ROOT / 'frontend' / 'js' / 'data.js', 'r', encoding='utf-8') as f:
    datajs_content = f.read()

gform_quotes = []
quotes_block_match = re.search(r'const QUOTES = \[(.*?)\];', datajs_content, re.DOTALL)
if quotes_block_match:
    lines = quotes_block_match.group(1).strip().split('\n')
    for line in lines:
        m = re.search(r"t:\s*(\d+),\s*s:\s*'(.*?)',\s*(?:source:\s*'(.*?)',\s*)?x:\s*(['\"].*['\"])", line)
        if m:
            t = int(m.group(1))
            s = m.group(2)
            raw_x = m.group(4)
            # unwrap quotes
            if (raw_x.startswith("'") and raw_x.endswith("'")) or (raw_x.startswith('"') and raw_x.endswith('"')):
                text_val = raw_x[1:-1]
            else:
                text_val = raw_x
            # unescape single quote if needed
            text_val = text_val.replace("\\'", "'").replace('\\"', '"')
            gform_quotes.append({'t': t, 's': s, 'source': 'gform', 'x': text_val})
            if len(gform_quotes) == 30:
                break

print(f"Loaded {len(gform_quotes)} GForm quotes and {len(tele_quotes)} Telegram quotes.")

# 3. Gabungkan 30 GForm + 30 Telegram (total 60)
merged_quotes = gform_quotes + tele_quotes

# Simpan ke data/outputs_teks/student_voice_quotes.json dan student_voice_merged.json
output_json_path = ROOT / 'data' / 'outputs_teks' / 'student_voice_quotes.json'
with open(output_json_path, 'w', encoding='utf-8') as f:
    json.dump(merged_quotes, f, indent=2, ensure_ascii=False)
print(f"Saved merged quotes to {output_json_path}")

output_merged_path = ROOT / 'data' / 'outputs_teks' / 'student_voice_merged.json'
with open(output_merged_path, 'w', encoding='utf-8') as f:
    json.dump(merged_quotes, f, indent=2, ensure_ascii=False)
print(f"Saved merged quotes copy to {output_merged_path}")

# 4. Susun Format Baru untuk QUOTES di data.js
quotes_js_lines = ["const QUOTES = ["]
for q in merged_quotes:
    json_text = json.dumps(q['x'], ensure_ascii=False)
    quotes_js_lines.append(f"  {{ t: {q['t']}, s: '{q['s']}', source: '{q['source']}', x: {json_text} }},")
quotes_js_lines.append("];")
new_quotes_block = "\n".join(quotes_js_lines)

# 5. Susun Katalog Rekomendasi Baru (14 Program di RECOS)
new_recos_block = """const RECOS = [
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
    owner: 'Kemahasiswaan & Hima', duration: '1 semester', effort: 'Rendah', kpi: 'Tingkat keterlibatan mahasiswa non-aktif naik 20%' },
  { id: 'r8', title: 'Perbaikan Layanan Digital & Fasilitas Belajar', metric: 'wellbeing', t: 0, profiles: [0],
    desc: 'Menstabilkan wifi saat ujian daring, memperpanjang jam ruang belajar musim ujian, dan mempercepat tanggapan komplain lab.',
    owner: 'UPT Komputer & Jaringan', duration: '2–3 bulan', effort: 'Tinggi', kpi: 'Keluhan wifi saat ujian turun 60%' },
  { id: 'r9', title: 'Workshop Manajemen Finansial Mahasiswa Rantau', metric: 'wellbeing', t: 2, profiles: [0, 1],
    desc: 'Pelatihan budgeting, pengelolaan uang saku, dan akses pekerjaan paruh waktu kampus bagi mahasiswa rantau berpenghasilan pas-pasan.',
    owner: 'Bagian Kemahasiswaan & Hima', duration: '1 bulan', effort: 'Rendah', kpi: 'Tingkat stres finansial mahasiswa rantau menurun 25%' },
  { id: 'r10', title: 'Forum Dialog Terbuka Evaluasi Kuliah & Dosen', metric: 'pressure', t: 0, profiles: [0, 1],
    desc: 'Ruang aspirasi tertutup dan aman antara perwakilan kelas dengan manajemen prodi per triwulan untuk evaluasi transparansi nilai dan beban tugas.',
    owner: 'Manajemen Mutu Akademik & BEM', duration: 'Tiap tengah semester', effort: 'Sedang', kpi: '90% keluhan tugas praktikum tertindaklanjuti prodi' },
  { id: 'r11', title: 'Program Peer Mentoring Mahasiswa Unggul', metric: 'social', t: 3, profiles: [2],
    desc: 'Pemberdayaan mahasiswa Profil 3 (Unggul) sebagai mentor asistensi belajar sebaya untuk membantu rekan yang kesulitan materi kuliah praktikum.',
    owner: 'BEM & Himpunan Mahasiswa Jurusan', duration: '1 semester', effort: 'Rendah', kpi: 'Tingkat kelulusan mata kuliah praktikum naik 18%' },
  { id: 'r12', title: 'Posko Advokasi & Pendampingan Banding UKT', metric: 'wellbeing', t: 2, profiles: [0],
    desc: 'Layanan konsultasi berkas banding UKT dan pendampingan verifikasi data bagi mahasiswa yang mengalami penurunan ekonomi keluarga.',
    owner: 'Tim Advokasi Kemahasiswaan & BAAK', duration: '1 bulan masa her-registrasi', effort: 'Sedang', kpi: '100% berkas banding mahasiswa terverifikasi transparan' },
  { id: 'r13', title: 'Klinik Manajemen Waktu & Penulisan Laprak', metric: 'pressure', t: 0, profiles: [0],
    desc: 'Workshop intensif strategi menyelesaikan laporan praktikum tepat waktu tanpa mengorbankan jam istirahat dan kesehatan mental.',
    owner: 'Pusat Pembinaan Akademik Prodi', duration: '1 semester', effort: 'Rendah', kpi: 'Tingkat keterlambatan laporan praktikum turun 40%' },
  { id: 'r14', title: 'PENS Virtual Job Fair & Pitching Magang', metric: 'career', t: 1, profiles: [1, 2],
    desc: 'Bursa kerja magang khusus mitra industri vokasi untuk memfasilitasi mahasiswa semester 6 dan 7 melakukan wawancara langsung.',
    owner: 'Pusat Karier & Inkubator Bisnis PENS', duration: '3 bulan persiapan', effort: 'Tinggi', kpi: 'Terserapnya minimal 120 mahasiswa ke program magang BUMN/swasta' }
];"""

# Replace QUOTES block
start_q = datajs_content.find('const QUOTES = [')
end_q = datajs_content.find('];', start_q) + 2

datajs_content = datajs_content[:start_q] + new_quotes_block + datajs_content[end_q:]

# Re-find RECOS because indices shifted
start_r = datajs_content.find('const RECOS = [')
end_r = datajs_content.find('];', start_r) + 2
datajs_content = datajs_content[:start_r] + new_recos_block + datajs_content[end_r:]

with open(ROOT / 'frontend' / 'js' / 'data.js', 'w', encoding='utf-8') as f:
    f.write(datajs_content)

print("Successfully updated frontend/js/data.js with 60 merged quotes and 14 recommendations!")

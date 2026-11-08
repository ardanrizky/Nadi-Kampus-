# Student Voice dari Gform — urutan pengerjaan

Semua perintah dijalankan dari root repo `Nadi-Kampus-` (PowerShell).

## 0. Taruh file
| File | Tujuan |
|---|---|
| `build_gform_voice.py` | `scripts/` |
| `seed_gform_to_supabase.py` | `scripts/` |
| `train_label_model.py` | `scripts/` |
| `label_voice_endpoint.py` | bahan tempel ke `api/index.py` (bukan file baru) |
| `app_js_changes.js` | panduan edit `frontend/js/app.js` (bukan file baru) |
| `nadikampus_sentiment_labeled.parquet` | `data/` (JANGAN di-commit, sudah di `.gitignore` di langkah 8) |

## 1. Latih model pelabel (di venv terpisah, versi sama dengan server)
```powershell
python -m venv venv_label
.\venv_label\Scripts\activate
pip install scikit-learn==1.4.2 numpy==1.26.4 pandas pyarrow joblib==1.4.0
python scripts/train_label_model.py --labeled data/nadikampus_sentiment_labeled.parquet --out models/label_voice.joblib
deactivate
```
Cek angka di terminal: sentimen test macro-F1 ≈ 0,79 dan kategori ≈ 0,74.

## 2. Hitung statistik + ubah data.js
```powershell
# lihat dulu perubahannya (belum menulis apa pun):
python scripts/build_gform_voice.py --labeled data/nadikampus_sentiment_labeled.parquet --datajs frontend/js/data.js
# kalau sudah sesuai, terapkan (membuat frontend/js/data.js.bak):
python scripts/build_gform_voice.py --labeled data/nadikampus_sentiment_labeled.parquet --datajs frontend/js/data.js --write
```
Hasil: 5 topik baru di `TOPICS`, bobot topik di semua prodi, dan `t` di `RECOS` dipetakan ulang.
Python untuk langkah ini butuh `pandas pyarrow scikit-learn` (venv biasa boleh).

## 3. Cek kode lain yang memakai indeks topik lama (0–6)
```powershell
Select-String -Path frontend\js\*.js -Pattern 'TOPICS\[[0-9]|topicIndex|\.t === [0-9]|topicW\[[0-9]' | Select-Object Path, LineNumber, Line
```
Kirim hasilnya bila ada baris selain yang sudah kita bahas.

## 4. Edit app.js
Ikuti 4 edit di `app_js_changes.js`.

## 5. Endpoint API
Tempel isi `label_voice_endpoint.py` ke `api/index.py`. Commit juga `models/label_voice.joblib`.

## 6. Isi tabel Supabase (project harus sudah di-Resume)
```powershell
# baca dulu seluruh komentar di data\processed\gform_voice_rows.json
# komentar yang tidak boleh tampil: tulis "_doc_id"-nya satu per baris di data\processed\exclude.txt
python scripts/seed_gform_to_supabase.py --rows data/processed/gform_voice_rows.json --exclude data/processed/exclude.txt
# kirim sungguhan (kunci service_role dipegang pemilik project, JANGAN dikirim lewat chat):
$env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="..."
python scripts/seed_gform_to_supabase.py --rows data/processed/gform_voice_rows.json --exclude data/processed/exclude.txt --commit
```
Skrip mengirim 1 baris dulu. Kalau Supabase menolak (kolom wajib belum terisi, mis. `semester`), skrip berhenti dan mencetak pesannya; ulangi `build_gform_voice.py` dengan `--semester <angka>`.

## 7. Uji
- Buka `dashboard.html#voice`: donut ±58% positif / 17% netral / 25% negatif, lima topik, komentar Gform tampil.
- Kirim curhat uji: kartu "Curhat Baru" muncul, tersimpan di Supabase, topik dan sentimen terisi dari API.
- Matikan API (atau offline): curhat tetap diterima lewat aturan bawaan.

## 8. .gitignore
```
data/nadikampus_sentiment_labeled.parquet
data/processed/gform_voice_rows.json
data/processed/exclude.txt
venv_label/
*.bak
```
`gform_voice_stats.json` boleh di-commit (tanpa teks).

## Batasan
- Filter prodi: Gform tidak punya kolom prodi, jadi semua prodi menampilkan distribusi topik kampus yang sama.
- Pelabel ringan: sentimen Gform macro-F1 ≈ 0,60 (netral lemah). Hasil `low_confidence` sebaiknya ditinjau.
- Insert curhat tetap dilakukan browser dengan kunci `anon` (seperti sekarang): belum ada moderasi atau pembatasan spam.

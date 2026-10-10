# Folder Data Survei Masuk (Incoming Survey Data)

Folder ini digunakan untuk menampung file CSV kuesioner mahasiswa baru (misalnya unduhan baru dari Google Form).

### Cara Menggunakan:
1. Letakkan file CSV kuesioner baru di dalam folder ini (misal: `survei_batch_2.csv`).
2. Jalankan perintah terminal:
   ```bash
   python scripts/import_new_survey.py data/incoming/survei_batch_2.csv
   ```
   Atau cukup jalankan:
   ```bash
   python scripts/import_new_survey.py
   ```
   *(Sistem akan otomatis mendeteksi file CSV baru di folder ini).*

3. Data baru akan otomatis di-scoring 4 dimensi, diklasifikasikan ke Profil 1–5 berdasarkan model **LPA-GMM**, dan diunggah langsung ke database Supabase `student_surveys` tanpa menimpa 119 data lama!

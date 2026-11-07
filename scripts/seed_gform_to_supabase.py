"""
Kirim komentar Gform (hasil build_gform_voice.py) ke tabel Supabase `student_voice`.
Kolom yang dikirim sama dengan yang di-insert form di app.js:
  text, topic_index, topic_name, sentiment, prodi, semester, created_at

  # cek dulu (tidak mengirim apa pun):
  python scripts/seed_gform_to_supabase.py --rows data/processed/gform_voice_rows.json

  # kirim sungguhan (kunci HANYA lewat environment variable, bukan di kode / chat):
  $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="..."
  python scripts/seed_gform_to_supabase.py --rows data/processed/gform_voice_rows.json --commit

Komentar yang tidak boleh tampil: tulis `_doc_id`-nya (satu per baris) di file teks, lalu pakai --exclude file.txt
"""
import argparse, json, os, sys, urllib.error, urllib.request


def call(method, url, key, payload=None):
    req = urllib.request.Request(url, method=method, data=None if payload is None else json.dumps(payload).encode(),
                                 headers={"apikey": key, "Authorization": "Bearer " + key,
                                          "Content-Type": "application/json", "Prefer": "return=minimal"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        sys.exit(f"\nDITOLAK Supabase (HTTP {e.code}): {e.read().decode('utf-8', 'ignore')}\n"
                 "Biasanya: nama kolom salah, kolom wajib belum diisi (mis. --semester), atau project masih paused.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", required=True)
    ap.add_argument("--exclude", default=None)
    ap.add_argument("--commit", action="store_true")
    a = ap.parse_args()

    rows = json.load(open(a.rows, encoding="utf-8"))
    if a.exclude:
        ex = {l.strip() for l in open(a.exclude, encoding="utf-8") if l.strip()}
        rows = [r for r in rows if r["_doc_id"] not in ex]
    rows = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    print(f"{len(rows)} baris siap.")
    if not a.commit:
        print("Mode CEK: tidak ada yang dikirim. Tambahkan --commit untuk mengirim.")
        return

    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL dan SUPABASE_SERVICE_KEY di environment dulu.")
    base = url.rstrip("/") + "/rest/v1/student_voice"
    exist = {d["text"].strip().lower() for d in json.loads(call("GET", base + "?select=text&limit=10000", key))}
    new = [r for r in rows if r["text"].strip().lower() not in exist]
    print(f"Sudah ada di tabel: {len(rows) - len(new)} | akan dikirim: {len(new)}")
    call("POST", base, key, new[:1])            # uji 1 baris dulu; kalau ditolak, berhenti dengan pesan jelas
    for i in range(1, len(new), 100):
        call("POST", base, key, new[i:i + 100])
    print("Selesai.")


if __name__ == "__main__":
    main()

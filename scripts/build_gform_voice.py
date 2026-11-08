"""
Student Voice dari komentar Google Form berlabel sentimen.

Menghasilkan:
  data/processed/gform_voice_stats.json  -> angka donut / bar / kata kunci per kategori
  data/processed/gform_voice_rows.json   -> baris untuk tabel Supabase `student_voice` (belum dikirim)
  (opsional) memperbarui frontend/js/data.js: TOPICS, topicW per prodi, `t` di RECOS, dan QUOTES (komentar contoh -> komentar Gform nyata)

Dari root repo:
  python scripts/build_gform_voice.py --labeled data/nadikampus_sentiment_labeled.parquet
  python scripts/build_gform_voice.py --labeled data/nadikampus_sentiment_labeled.parquet --datajs frontend/js/data.js          # lihat perubahan saja
  python scripts/build_gform_voice.py --labeled data/nadikampus_sentiment_labeled.parquet --datajs frontend/js/data.js --write  # terapkan (membuat data.js.bak bila belum ada)
  Opsi QUOTES: --quotes-n 60 (jumlah komentar di data.js, 0 = jangan ubah QUOTES) dan --exclude exclude.txt (daftar _doc_id yang tidak boleh tampil)
"""
import argparse, difflib, io, json, os, re
import numpy as np, pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# urutan = indeks topik BARU di data.js (5 kategori = 5 dimensi survei)
CATS = [  # (kode dimensi, nama topik, metric untuk TOPICS)
    ("academic",  "Akademik & beban studi",   "pressure"),
    ("career",    "Karier & magang",          "career"),
    ("economic",  "Biaya kuliah & ekonomi",   "wellbeing"),
    ("social",    "Sosial & pertemanan",      "social"),
    ("wellbeing", "Kesejahteraan & dukungan", "wellbeing"),
]
DIM_IDX = {c[0]: i for i, c in enumerate(CATS)}
# program di tab Recommendations -> topik baru
RECO_TOPIC = {"r1": 4, "r2": 0, "r3": 1, "r4": 2, "r5": 3, "r6": 0, "r7": 3, "r8": 0}

S_KEY = {"positive": "pos", "neutral": "neu", "negative": "neg"}
PII = re.compile(r"(?:https?://|www\.|@\w|\b\d{8,}\b|\S+@\S+\.\S+)", re.I)
STOP = set("""yang dan di ke dari untuk dengan ini itu saya aku kami kita anda nya ada tidak tak belum sudah sangat lebih juga
atau karena agar supaya bisa dapat akan pada dalam oleh jadi saat ketika masih sering kadang hanya cuma sih aja banget ya yg dg utk
tp tapi namun sebagai seperti para mereka dia ia merasa rasa buat lagi lah kalau jika bila sehingga serta tetapi sedikit banyak
semua setiap sama mahasiswa kuliah kampus masa terkadang memahami alhamdulillah lain lainnya membuat menjadi terlalu kurang
ingin harus perlu dibuat membantu saling""".split())


def keywords(docs, k=5):
    vec = TfidfVectorizer(stop_words=list(STOP), ngram_range=(1, 2), max_df=0.7, sublinear_tf=True,
                          token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]{2,}\b")
    X = vec.fit_transform([" ".join(d) or "kosong" for d in docs])
    vocab = np.array(vec.get_feature_names_out())
    out = []
    for i in range(len(docs)):
        row, words = X[i].toarray().ravel(), []
        for j in row.argsort()[::-1]:
            if row[j] <= 0 or len(words) == k: break
            w = vocab[j]
            if not any(w in x or x in w for x in words):
                words.append(w)
        out.append(words)
    return out


def js_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def patch_datajs(path, stats, quotes, write):
    with io.open(path, encoding="utf-8", newline="") as f:
        old = f.read()
    new = old
    nl = "\r\n" if "\r\n" in old else "\n"

    # 1) blok TOPICS
    lines = []
    for t in stats["topics"]:
        kw = ", ".join(js_str(k) for k in t["keywords"])
        lines.append(f"  {{ name: {js_str(t['name'])}, sent: [{t['sent'][0]}, {t['sent'][1]}, {t['sent'][2]}], "
                     f"metric: {js_str(t['metric'])},{nl}    keywords: [{kw}] }}")
    block = "var TOPICS = [" + nl + ("," + nl).join(lines) + nl + "];"
    new, n1 = re.subn(r"var TOPICS = \[.*?\r?\n\];", lambda m: block, new, count=1, flags=re.S)

    # 2) topicW semua prodi
    tw = "topicW: [" + ", ".join(str(t["w"]) for t in stats["topics"]) + "]"
    new, n2 = re.subn(r"topicW:\s*\[[^\]]*\]", lambda m: tw, new)

    # 3) t di RECOS
    n3 = 0
    for rid, t in RECO_TOPIC.items():
        new, c = re.subn(r"(id:\s*'" + rid + r"'[^{}]*?(?<=[\s,])t:\s*)\d+", lambda m: m.group(1) + str(t), new, count=1, flags=re.S)
        n3 += c
    # 4) QUOTES (komentar yang tampil bila Supabase kosong / paused)
    n4 = 1
    if quotes:
        qlines = [f"  {{ t: {q['t']}, s: {js_str(q['s'])}, x: {js_str(q['x'])} }}" for q in quotes]
        qblock = "const QUOTES = [" + nl + ("," + nl).join(qlines) + nl + "];"
        new, n4 = re.subn(r"const QUOTES = \[.*?\r?\n\];", lambda m: qblock, new, count=1, flags=re.S)
    print(f"data.js: TOPICS diganti={n1} | topicW diganti={n2} | RECOS dipetakan={n3}/{len(RECO_TOPIC)} | QUOTES diganti={n4 if quotes else 'dilewati'} ({len(quotes)} komentar)")
    if n1 != 1 or n3 != len(RECO_TOPIC) or n4 != 1:
        print("  [!] Ada bagian yang tidak ditemukan - cek struktur data.js. File TIDAK ditulis.")
        return
    diff = list(difflib.unified_diff(old.splitlines(), new.splitlines(), "data.js (lama)", "data.js (baru)", lineterm="", n=0))
    print("\n".join(d[:200] for d in diff[:40]) + (f"\n... (+{len(diff) - 40} baris diff lagi)" if len(diff) > 40 else ""))
    if write:
        if not os.path.exists(path + ".bak"):      # jangan timpa cadangan asli bila skrip dijalankan ulang
            with io.open(path + ".bak", "w", encoding="utf-8", newline="") as f: f.write(old)
        with io.open(path, "w", encoding="utf-8", newline="") as f: f.write(new)
        print(f"\nDITULIS: {path}  (cadangan asli: {path}.bak)")
    else:
        print("\nMode lihat saja. Tambahkan --write untuk menerapkan.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--labeled", required=True)
    ap.add_argument("--outdir", default="data/processed")
    ap.add_argument("--min-words", type=int, default=5, help="komentar lebih pendek tidak ikut ke tabel")
    ap.add_argument("--prodi", default="Anonim")
    ap.add_argument("--semester", type=int, default=None, help="isi bila kolom semester di tabel NOT NULL")
    ap.add_argument("--datajs", default=None)
    ap.add_argument("--quotes-n", type=int, default=60, help="jumlah komentar Gform di data.js (0 = QUOTES tidak diubah)")
    ap.add_argument("--quote-min-words", type=int, default=8, help="komentar contoh di data.js minimal sekian kata (supaya cukup jelas tanpa pertanyaannya)")
    ap.add_argument("--exclude", default=None, help="file berisi _doc_id yang tidak boleh tampil, satu per baris")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()

    g = pd.read_parquet(a.labeled)
    g = g[(g.source == "gform") & g.dimension.isin(DIM_IDX)].copy()
    g["topic_index"] = g.dimension.map(DIM_IDX)
    g["s"] = g.label_sentiment.map(S_KEY)
    g["x"] = g.text_clean.fillna("").str.strip()
    g["low"] = g.text_norm.fillna(g.x).str.lower()
    n = len(g)

    kws = keywords([g.loc[g.topic_index == i, "low"].tolist() for i in range(len(CATS))])
    topics = []
    for i, (dim, name, metric) in enumerate(CATS):
        sub = g[g.topic_index == i]
        pos = round(float((sub.s == "pos").mean() * 100), 1)
        neu = round(float((sub.s == "neu").mean() * 100), 1)
        topics.append({"name": name, "metric": metric, "n": int(len(sub)), "w": round(100 * len(sub) / n, 1),
                       "sent": [pos, neu, round(100 - pos - neu, 1)], "keywords": kws[i]})
    stats = {"meta": {"source": "gform", "n_comments": n}, "topics": topics}

    os.makedirs(a.outdir, exist_ok=True)
    json.dump(stats, open(os.path.join(a.outdir, "gform_voice_stats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{n} komentar Gform berlabel\n")
    for t in topics:
        print(f"  {t['name']:<26} n={t['n']:<4} bobot={t['w']:<5} pos/neu/neg={t['sent']}  #{' #'.join(t['keywords'])}")

    q = g[(g.x.str.split().str.len() >= a.min_words) & ~g.x.str.contains(PII)]
    q = q.assign(_k=q.x.str.lower()).drop_duplicates("_k").sort_values("timestamp")
    rows = [{"_doc_id": r.doc_id, "text": r.x, "topic_index": int(r.topic_index), "topic_name": CATS[r.topic_index][1],
             "sentiment": r.s, "prodi": a.prodi, "semester": a.semester,
             "created_at": r.timestamp.strftime("%Y-%m-%dT%H:%M:%S+07:00"),
             "_question": (r.model_input.split(":", 1)[0] if isinstance(r.model_input, str) and ":" in r.model_input else "")}
            for r in q.itertuples()]
    if a.exclude:
        ex = {l.strip() for l in open(a.exclude, encoding="utf-8") if l.strip()}
        rows = [r for r in rows if r["_doc_id"] not in ex]
    json.dump(rows, open(os.path.join(a.outdir, "gform_voice_rows.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n{len(rows)} komentar siap masuk tabel -> {a.outdir}/gform_voice_rows.json  (BACA dulu sebelum dikirim)")

    # komentar contoh untuk data.js: 6-45 kata, bergantian antar topik dan sentimen
    quotes = []
    if a.quotes_n > 0:
        pools = []
        for i in range(len(CATS)):
            per = {k: [r for r in rows if r["topic_index"] == i and r["sentiment"] == k and a.quote_min_words <= len(r["text"].split()) <= 45]
                   for k in ("neg", "pos", "neu")}
            seq, j = [], 0
            while any(per.values()):
                k = ("neg", "pos", "neu")[j % 3]; j += 1
                if per[k]: seq.append(per[k].pop(0))
            pools.append(seq)
        while len(quotes) < a.quotes_n and any(pools):
            for seq in pools:
                if seq and len(quotes) < a.quotes_n:
                    r = seq.pop(0)
                    quotes.append({"t": r["topic_index"], "s": r["sentiment"], "x": " ".join(r["text"].split()),
                                   "_id": r["_doc_id"], "_q": r["_question"]})
    if quotes:
        import csv
        rv = os.path.join(a.outdir, "gform_voice_quotes_review.csv")
        with open(rv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f); w.writerow(["doc_id", "topik", "sentimen", "pertanyaan_survei", "komentar"])
            for qq in quotes:
                w.writerow([qq["_id"], CATS[qq["t"]][1], qq["s"], qq["_q"], qq["x"]])
        print(f"Daftar {len(quotes)} komentar contoh untuk DIBACA -> {rv}")
    if a.datajs:
        print()
        patch_datajs(a.datajs, stats, quotes, a.write)


if __name__ == "__main__":
    main()

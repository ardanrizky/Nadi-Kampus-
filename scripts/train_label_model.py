"""
Latih model pelabel ringan (TF-IDF + Logistic Regression): sentimen + kategori.
JALANKAN di venv dengan versi yang sama seperti server (requirements.txt):

  python -m venv venv_label ; .\\venv_label\\Scripts\\activate
  pip install scikit-learn==1.4.2 numpy==1.26.4 pandas pyarrow joblib==1.4.0
  python scripts/train_label_model.py --labeled data/nadikampus_sentiment_labeled.parquet --out models/label_voice.joblib
"""
import argparse, joblib
import numpy as np, pandas as pd, sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import FeatureUnion, Pipeline

ap = argparse.ArgumentParser()
ap.add_argument("--labeled", required=True)
ap.add_argument("--out", default="models/label_voice.joblib")
a = ap.parse_args()
print("scikit-learn", sklearn.__version__, "| numpy", np.__version__)

df = pd.read_parquet(a.labeled)
df["x"] = df.text_norm.fillna(df.text_clean).fillna("").str.lower()


def make():
    return Pipeline([
        ("f", FeatureUnion([("w", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
                            ("c", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=3, sublinear_tf=True))])),
        ("lr", LogisticRegression(C=4, max_iter=2000, class_weight="balanced"))])


tr, va, te = (df[df.split == s] for s in ("train", "val", "test"))
m = make().fit(tr.x, tr.label_sentiment)
for name, d in (("val", va), ("test", te)):
    print(f"[sentimen] {name}: macro-F1 = {f1_score(d.label_sentiment, m.predict(d.x), average='macro'):.3f}")
gt = te[te.source == "gform"]
print(f"[sentimen] test gform saja (n={len(gt)}):\n", classification_report(gt.label_sentiment, m.predict(gt.x), digits=3, zero_division=0))

g = df[(df.source == "gform") & df.dimension.notna()]
p = cross_val_predict(make(), g.x, g.dimension, cv=StratifiedKFold(5, shuffle=True, random_state=42))
print(f"[kategori] 5-fold CV macro-F1 = {f1_score(g.dimension, p, average='macro'):.3f}")

trv = pd.concat([tr, va])
joblib.dump({"sentiment": make().fit(trv.x, trv.label_sentiment), "category": make().fit(g.x, g.dimension),
             "sklearn": sklearn.__version__}, a.out, compress=3)
print("Model tersimpan:", a.out)

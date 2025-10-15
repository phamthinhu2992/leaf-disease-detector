import os
import json
import argparse
from tqdm import tqdm

import numpy as np
import torch
import clip
from PIL import Image

try:
    import openai
except Exception:
    openai = None


def load_labels(labels_file):
    with open(labels_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def clip_suggest(images_dir, labels, device="cpu", clip_model="ViT-B/32", topk=3):
    model, preprocess = clip.load(clip_model, device=device)
    model.eval()
    text_prompts = [f"Ảnh lá: {lab}" for lab in labels]
    text_tokens = clip.tokenize(text_prompts).to(device)
    with torch.no_grad():
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    results = {}
    for fname in tqdm(sorted(os.listdir(images_dir))):
        path = os.path.join(images_dir, fname)
        if not os.path.isfile(path):
            continue
        try:
            img = preprocess(Image.open(path).convert("RGB")).unsqueeze(0).to(device)
        except Exception:
            continue
        with torch.no_grad():
            img_feat = model.encode_image(img)
            img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)
            sims = (img_feat @ text_features.T).squeeze(0).cpu().numpy()
        # convert similarities to softmax-style scores
        exp = np.exp(sims - sims.max())
        probs = (exp / exp.sum()).tolist()
        ranked = sorted(enumerate(probs), key=lambda x: x[1], reverse=True)[:topk]
        results[path] = [{"label": labels[i], "score": float(s)} for i, s in ranked]
    return results


def gpt_generate_info(labels_to_generate, openai_model="gpt-3.5-turbo", lang="vi"):
    if openai is None:
        raise RuntimeError("openai package not installed. pip install openai")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Set OPENAI_API_KEY environment variable")
    openai.api_key = api_key

    info = {}
    for lbl in labels_to_generate:
        system = {"role": "system", "content": "Bạn là một chuyên gia nông nghiệp/nhà tư vấn trồng trọt. Viết bằng tiếng Việt, ngắn gọn, chính xác và dễ hiểu."}
        user = {"role": "user", "content": (
            f"Tạo JSON entry cho nhãn bệnh '{lbl}'. Trả đúng JSON object gồm các trường: "
            "\"conclusion\", \"name\", \"description\", \"symptoms\", \"treatment\", \"recommendations\", \"severity\". "
            "treatment là mảng các bước (nên có 3-6 bước cụ thể). Không thêm văn bản khác ngoài JSON."
        )}
        try:
            resp = openai.ChatCompletion.create(model=openai_model, messages=[system, user], temperature=0.2, max_tokens=600)
            text = resp['choices'][0]['message']['content'].strip()
            # some models wrap JSON in markdown; try to extract first JSON block
            start = text.find('{')
            end = text.rfind('}') + 1
            json_text = text[start:end]
            entry = json.loads(json_text)
            info[lbl] = entry
        except Exception as e:
            info[lbl] = {
                "conclusion": f"Mẫu cho {lbl} (tự sinh thất bại: {e})",
                "name": lbl,
                "description": "",
                "symptoms": "",
                "treatment": [],
                "recommendations": "",
                "severity": ""
            }
    return info


def main():
    p = argparse.ArgumentParser(description="Auto-label images with CLIP + generate disease_info draft with ChatGPT")
    p.add_argument('--images-dir', required=True)
    p.add_argument('--labels-file', required=True, help='JSON list of label keys (tiếng Việt keys)')
    p.add_argument('--out-suggestions', default='suggestions_clip.json')
    p.add_argument('--out-info', default='disease_info_suggestions.json')
    p.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    p.add_argument('--clip-model', default='ViT-B/32')
    p.add_argument('--topk', type=int, default=3)
    p.add_argument('--generate-info', action='store_true', help='Call OpenAI to generate draft disease_info for suggested labels')
    p.add_argument('--openai-model', default='gpt-3.5-turbo')
    args = p.parse_args()

    labels = load_labels(args.labels_file)
    suggestions = clip_suggest(args.images_dir, labels, device=args.device, clip_model=args.clip_model, topk=args.topk)

    os.makedirs(os.path.dirname(args.out_suggestions) or '.', exist_ok=True)
    with open(args.out_suggestions, 'w', encoding='utf-8') as fo:
        json.dump(suggestions, fo, ensure_ascii=False, indent=2)
    print("Saved suggestions to", args.out_suggestions)

    if args.generate_info:
        # collect top suggested labels across images (unique)
        top_labels = set()
        for v in suggestions.values():
            if v:
                top_labels.add(v[0]['label'])
        top_labels = sorted(list(top_labels))
        info = gpt_generate_info(top_labels, openai_model=args.openai_model)
        os.makedirs(os.path.dirname(args.out_info) or '.', exist_ok=True)
        with open(args.out_info, 'w', encoding='utf-8') as fo:
            json.dump(info, fo, ensure_ascii=False, indent=2)
        print("Saved generated disease_info drafts to", args.out_info)
    print("Done.")


if __name__ == "__main__":
    main()
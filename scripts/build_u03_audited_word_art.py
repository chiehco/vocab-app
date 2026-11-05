"""Prepare locally reviewed general-card pairs without publishing draft units."""
import hashlib
import json
import sys
from pathlib import Path
from audit_paths import resolve_source, source_reference

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image

def read(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

def main():
    source=read(ROOT/'output/unit-audit-20261105/LV1-U03-unpublished-source.json')
    words=read(ROOT/'public/data/v1/words.json')
    wanted={1,6,7,10,11,16,17,19,20,21,27,32,34,35,36,43,44,45}
    proof_path=ROOT/'docs/unit-audit-20261105/LV1-U03-original-image-review.json'
    previous={r['id']:r for r in read(proof_path)['cards']} if proof_path.exists() else {}
    observations=[
      '狗張嘴吠叫，有聲響線，花園門口有人走近；與現有原稿句一致。',
      '角色欣賞古城，表情及雙手支持愛上城市；首次造訪不強求像素證實。',
      '角色以藍色鋼筆準備在紙上簽名；無字風格合理省略簽名字形。',
      '手持鉛筆與削鉛筆器，木屑及桌上地圖，核心削筆畫地圖清楚。',
      '橡皮擦擦除鉛筆線並有橡皮屑，錯誤答案以無文字簡化。',
      '晨光下將新鮮蘋果放入午餐盒。',
      '大角色剝香蕉，小角色拿分得的香蕉段，支持與弟弟分享。',
      '年長女性角色向孩子說話；誠實的重要性是抽象內容，無矛盾。',
      '售票亭手持恰好三張票，空票盤支持只剩三張。',
      '蜜蜂飛近黃色花朵，飛行聲響合理圖像化。',
      '一匙蜂蜜流入冒熱氣茶杯，支持加入並攪拌的動作前後簡化。',
      '帶書包角色在學校旁上下公車，支持搭車上學；便宜方便為動機省略。',
      '夜間書桌整齊疊書，支持每晚整理課本；頻率不強求像素證實。',
      '夜間多位家人圍桌吃晚餐，核心一致。',
      '角色雙手打開窗戶，通風線及臉頰泛紅支持熱房間開窗。',
      '角色手持新手機，旁有破損舊手機及新機盒，換新手機核心明確。',
      '角色喜愛穿黃色迷你雨衣的小狗，cute核心一致。',
      '早餐煎蛋及一片吐司清楚；叉上小塊蛋視為正在食用的簡化。',
      '廚房牆有瓢蟲，角色持放大鏡觀察，昆蟲情境一致。',
      '城市路面多人急行、公車擁擠、角色趕路，尖峰時間繁忙一致。',
      '多代家人圍桌，燈籠梅花及豐盛中式餐點，支持農曆新年團聚。',
      '大小兩角色抬重箱上樓梯，哥哥協助核心一致。',
      '客廳角落高身擺鐘，有鐘擺與上鏈鑰匙，grandfather clock複合名詞清楚。',
      '年長女性角色端新烤餅乾給孩子，探訪奶奶吃餅乾核心一致。',
    ]
    assert len(source)==len(observations)==24
    evidence=[];registry=[]
    target=ROOT/'public/wordbeast/audited-20261105';target.mkdir(parents=True,exist_ok=True)
    for row,observation in zip(source,observations):
        original=resolve_source(row['sourceImage'])
        assert sha(original)==row['sourceImageSha256'],row['id']
        with Image.open(original) as image:
            image.load();size=image.size
            if int(row['id'].rsplit('-',1)[1]) in wanted:
                name=f"{row['id']}-{row['sourceImageSha256'][:12]}.webp"
                out=target/name
                if out.exists():
                    assert previous[row['id']]['publishedImageSha256']==sha(out),'Existing local revision changed; inspect before replacing'
                else:
                    image.convert('RGB').save(out,'WEBP',quality=85,method=6)
        check={'id':row['id'],'word':row['word'],'officialWordId':row['officialWordId'],
               'sourceImage':source_reference(original),'sourceImageSha256':row['sourceImageSha256'],
               'captionEn':row['captionEn'],'captionZh':row['captionZh'],'observation':observation,
               'pixelReview':'agent actually viewed original PNG 2026-11-05','dimensions':list(size),
               'draftUnitPublication':'unchanged; not added to lv1ReviewedImages or curriculum',
               'generalCardIntegration':'not_changed'}
        if int(row['id'].rsplit('-',1)[1]) in wanted:
            with Image.open(out) as decoded:decoded.load();assert decoded.size==size
            w=next(w for w in words if w['wordId']==row['officialWordId'])
            registry.append({'reviewId':row['id'],'officialWordId':w['wordId'],
                'aliases':sorted({w['word'].lower(),row['word'].lower(),*[x.lower() for x in w.get('wordVariants',[])]}),
                'illustration':{'path':'wordbeast/audited-20261105/'+name,'captionEn':row['captionEn'],'captionZh':row['captionZh']}})
            check.update(publishedImageSha256=sha(out),localAsset='public/wordbeast/audited-20261105/'+name,
                         generalCardIntegration='local_pair_prepared_not_ui_verified',reason='15 actual missing general images; window snow mismatch; egg five-versus-three mismatch; bus waiting caption paired with got-off example. Restore exact reviewed source image/caption pair; original formal sentences retained')
        evidence.append(check)
    write(ROOT/'docs/unit-audit-20261105/LV1-U03-original-image-review.json',{'reviewer':'Codex agent under direct user review-and-fix authorization','unitDrafts':46,'previouslyPublishedPairs':22,'unpublishedPairsReviewed':24,'generalCardPairsPrepared':len(registry),'cards':evidence,'publication':{'push':False,'deploy':False,'draftUnitsAdopted':False}})
    registry_path=ROOT/'src/features/vocabulary/auditedWordIllustrations.json'
    retained=read(registry_path) if registry_path.exists() else []
    for entry in registry:
        old=next((r for r in retained if r['officialWordId']==entry['officialWordId']),None)
        if old:assert old==entry,'A different general-card review already exists; inspect priority'
        else:retained.append(entry)
    write(registry_path,retained)
    print(json.dumps({'originalPngsViewed':24,'localGeneralPairs':len(registry),'draftUnitManifestChanged':False}))

if __name__=='__main__':main()

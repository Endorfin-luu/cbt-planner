# ヨミの塔のドット絵：塗りの形（左半分）から、左右反転・縁取り・陰影をつけて yomi-art-data.js を作る
# 文字：. 透明 / k 黒目 / e 白 / p ほお（陰影なし）/ それ以外は palette の色（自動で明暗がつく）
import json, sys, colorsys
from PIL import Image

def hx(c): c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))
def th(t): return '#%02x%02x%02x'%tuple(max(0,min(255,int(round(v)))) for v in t)
def mix(a,b,k): a,b=hx(a),hx(b); return th(tuple(a[i]*(1-k)+b[i]*k for i in range(3)))

S = {}   # id -> (palette, rows(left half or full), opts)
def spr(id, pal=None, rows=None, w=24, outline=None, sym=True):
    S[id]=dict(pal=pal, rows=rows, w=w, outline=outline, sym=sym)

FIXED = {'k':'#17121f','e':'#ffffff','p':'#ff9eb0','o':None}

def build(d):
    w=d['w']; h=len(d['rows'])
    grid=[]
    for r in d['rows']:
        if d['sym']:
            assert len(r)==w//2, (r,len(r))
            grid.append(list(r+r[::-1]))
        else:
            assert len(r)==w,(r,len(r)); grid.append(list(r))
    pal=dict(d['pal'])
    main=pal.get('b') or list(pal.values())[0]
    oc=d['outline'] or mix(main,'#0b0716',.78)
    filled=lambda y,x: 0<=y<h and 0<=x<w and grid[y][x]!='.'
    out=[[None]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            L=grid[y][x]
            if L=='.':
                if any(filled(y+dy,x+dx) for dy,dx in ((1,0),(-1,0),(0,1),(0,-1))): out[y][x]=oc
                continue
            if L in ('k','e','p'):
                out[y][x]=FIXED[L]; continue
            if L=='o': out[y][x]=oc; continue
            base=pal[L]
            dark=mix(base,oc,.38); light=mix(base,'#ffffff',.30)
            edge=lambda yy,xx: not filled(yy,xx)
            if edge(y+1,x) or (x>=w//2 and edge(y,x+1)) or (y+1<h and grid[y+1][x] not in (L,'k','e','p') and grid[y+1][x]!='.' and L in pal and False):
                out[y][x]=dark
            elif edge(y-1,x) or (x<w//2 and edge(y,x-1)):
                out[y][x]=light
            else: out[y][x]=base
    return out

def encode(img):
    cols=[]; rows=[]
    CH="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for r in img:
        s=''
        for c in r:
            if c is None: s+='.'; continue
            if c not in cols: cols.append(c)
            s+=CH[cols.index(c)]
        rows.append(s)
    return {'c':cols,'r':rows}

def sheet(ids, path, scale=5):
    imgs=[(i,build(S[i])) for i in ids]
    W=max(len(im[0]) for _,im in imgs); H=max(len(im) for _,im in imgs)
    n=len(imgs); per=8; rows=(n+per-1)//per
    sh=Image.new('RGB',((W+4)*per*scale,(H+4)*rows*scale),(40,32,64))
    for k,(i,im) in enumerate(imgs):
        ox=(k%per)*(W+4)+2; oy=(k//per)*(H+4)+2
        for y,r in enumerate(im):
            for x,c in enumerate(r):
                if c:
                    for a in range(scale):
                        for b in range(scale): sh.putpixel(((ox+x)*scale+a,(oy+y)*scale+b),hx(c))
    sh.save(path)

exec(open(sys.argv[1]).read())
if len(sys.argv)>2 and sys.argv[2]=='sheet':
    ids=sys.argv[3].split(',') if len(sys.argv)>3 else list(S.keys())
    sheet(ids, '/tmp/pw/sprites.png')
else:
    data={i:encode(build(d)) for i,d in S.items()}
    open(sys.argv[2],'w').write('/* 生成ファイル：tools/yomi_sprites.py で作る */\n"use strict";\nwindow.YOMI_SPR = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
    print('wrote',len(data))

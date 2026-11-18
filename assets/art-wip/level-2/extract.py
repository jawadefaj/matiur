import sys, numpy as np
from PIL import Image
def extract(src, box, p=6.65):
    im=Image.open(src).convert('RGB'); a=np.asarray(im.crop(box)).astype(int)
    def off(axis):
        g=np.abs(np.diff(a,axis=axis)).sum(2).sum(1-axis)
        return max(((g[(np.arange(o,len(g),p)).astype(int)].mean(),o) for o in np.arange(0,p,0.25)))[1]
    xo,yo=off(1),off(0)
    xs=np.arange(xo+p/2,a.shape[1]-1,p).astype(int); ys=np.arange(yo+p/2,a.shape[0]-1,p).astype(int)
    bg=a[2,2]; out=np.zeros((len(ys),len(xs),4),np.uint8)
    for j,y in enumerate(ys):
        for i,x in enumerate(xs):
            c=np.median(a[y-1:y+2,x-1:x+2].reshape(-1,3),axis=0)
            out[j,i,:3]=c; out[j,i,3]=0 if np.abs(c-bg).sum()<45 else 255
    img=Image.fromarray(out,'RGBA'); return img.crop(img.getbbox())
def pad(img,n=64):
    c=Image.new('RGBA',(n,n),(0,0,0,0)); c.paste(img,((n-img.width)//2,n-img.height-2)); return c

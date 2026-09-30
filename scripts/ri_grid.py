import xml.etree.ElementTree as ET
def txt(c): return ' '.join(''.join(c.itertext()).split())
def grid(tw):
    rows=[];pend={}
    for r,tr in enumerate(tw.iter('tr')):
        row=[];c=0
        cells=[x for x in tr if x.tag in('td','th')]
        it=iter(cells)
        while True:
            while c in pend and pend[c][0]>0:
                v,n=pend[c][1],pend[c][0];row.append(v);pend[c]=(n-1,v);c+=1
            x=next(it,None)
            if x is None:break
            cs=int(x.get('colspan',1));rs=int(x.get('rowspan',1));v=txt(x)
            for k in range(cs):
                row.append(v)
                if rs>1:pend[c]=(rs-1,v)
                c+=1
        while c in pend and pend[c][0]>0:
            row.append(pend[c][1]);pend[c]=(pend[c][0]-1,pend[c][1]);c+=1
        rows.append(row)
    return rows
def tables(f):
    return {tw.get('id'):grid(tw) for tw in ET.parse(f).getroot().iter('table-wrap')}

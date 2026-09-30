#!/usr/bin/env python3
"""Europe PMC 전문 XML(data/raw)에서 소아 참고구간 표를 long-format CSV로 정규화한다.
사용: python3 scripts/extract-caliper-ri.py  → data/caliper-ri.csv
원문 값은 수정하지 않는다. 파싱이 안 되는 셀(원문 오타 등)은 flag에 남긴다."""
import csv,re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from ri_grid import tables

RAW='data/raw'
COLS=['paper_no','table_id','analyte','unit','population','platform','sex','age','n','lower','upper','lower_ci','upper_ci','ci_level','flag']
NUM=r'[\d][\d,]*\.?\d*'
def split(v):
    """'101.0 (100.2–101.8)' → (101.0, '100.2–101.8'); 실패 시 flag."""
    v=v.strip()
    if v in('','–','-'): return None,None,'missing'
    m=re.fullmatch(rf'({NUM})\s*\(({NUM})\s*[–-]\s*({NUM})\)',v)
    if m: return m[1].replace(',',''),f'{m[2]}–{m[3]}',''
    m=re.match(rf'({NUM})',v)
    return (m[1].replace(',','') if m else None),None,f'ci_unparsed:{v}'
def rows_out(meta,rows):
    for r in rows: yield {**dict.fromkeys(COLS,''),**meta,**r}

def p19(f,out):  # 이란 2–30개월 생화학, Alpha Classic-AT plus
    g=tables(f)['jcmm17646-tbl-0001']
    for r in g[2:]:
        a=re.match(r'(.*) \((.*)\)$',r[0])
        out.append(dict(paper_no=19,table_id='T1',analyte=a[1],unit=a[2],population='Iran, 0–<30 months',platform='Alpha classic-AT plus (Pars Azmoun kits)',
            sex='both',age=r[1]+' months',n=r[2],lower=r[3],upper=r[4],lower_ci=r[5],upper_ci=r[6],ci_level='90%',flag='ci_lower_missing' if r[5]=='–' else ''))
def p6(f,out):   # 이란 0–30개월 간기능
    g=tables(f)['jcla24995-tbl-0001']
    for r in g[2:]:
        a=re.match(r'(.*) \((.*)\)$',r[0])
        out.append(dict(paper_no=6,table_id='T1',analyte=a[1],unit=a[2],population='Iran, 3 days–30 months',platform='Alpha classic-AT plus (Biorex kits)',
            sex='both',age=r[1],n=r[2],lower=r[3],upper=r[4],lower_ci=r[5],upper_ci=r[6],ci_level='CI(level not stated in table)',flag=''))
def p36(f,out):  # Hb/MCV 2–36개월, Sysmex XN-9000
    T=tables(f)
    units={'Hemoglobin':'g/L','Mean Capsular Volume':'fL'}  # 원문 표기 그대로('Capsular'는 원문 오기 추정)
    base=dict(paper_no=36,population='Canada (TARGet Kids!), 2–36 months',platform='Sysmex XN-9000')
    def an(s): return 'HGB' if s.startswith('Hemoglobin') else 'MCV'
    # Tab2: 성별 구분
    an_=None
    for r in T['Tab2'][3:]:
        if r[0]==r[1]: an_=an(r[0]);continue
        for sex,o in(('F',1),('M',4)):
            lo,loci,f1=split(r[o+1]);up,upci,f2=split(r[o+2])
            out.append({**dict.fromkeys(COLS,''),**base,'table_id':'Tab2','analyte':an_,'unit':'g/L' if an_=='HGB' else 'fL','sex':sex,'age':r[0],'n':r[o],
                'lower':lo,'upper':up,'lower_ci':loci,'upper_ci':upci,'ci_level':'90%','flag':';'.join(x for x in(f1,f2) if x)})
    # Tab3: 성별 통합
    for r in T['Tab3'][2:]:
        if r[0]==r[1]: an_=an(r[0]);continue
        lo,loci,f1=split(r[1]);up,upci,f2=split(r[2])
        out.append({**dict.fromkeys(COLS,''),**base,'table_id':'Tab3','analyte':an_,'unit':'g/L' if an_=='HGB' else 'fL','sex':'both','age':r[0],
            'lower':lo,'upper':up,'lower_ci':loci,'upper_ci':upci,'ci_level':'90%','flag':';'.join(x for x in(f1,f2) if x)})
    # Tab4: 월/분기, 성별 통합
    for r in T['Tab4'][3:]:
        if r[0]==r[1]: continue
        for an_,o in(('HGB',1),('MCV',3)):
            lo,loci,f1=split(r[o]);up,upci,f2=split(r[o+1])
            if lo is None and up is None: continue
            out.append({**dict.fromkeys(COLS,''),**base,'table_id':'Tab4','analyte':an_,'unit':'g/L' if an_=='HGB' else 'fL','sex':'both','age':r[0],
                'lower':lo,'upper':up,'lower_ci':loci,'upper_ci':upci,'ci_level':'90%','flag':';'.join(x for x in(f1,f2) if x)})
def p26(f,out):  # 중국 신생아 MS/MS 35종, 일령·성별
    g=tables(f)['T2']
    for r in g[3:]:
        if r[0]==r[1]: continue  # 섹션 제목 행(Amino acids/Acylcarnitines)
        age=re.sub(r'\s*\(\s*\w\s*\)\s*$','',r[1])
        for sex,o in(('M',2),('F',5)):
            lo,loci,f1=split(r[o]);up,upci,f2=split(r[o+1])
            out.append({**dict.fromkeys(COLS,''),'paper_no':26,'table_id':'T2','analyte':r[0],'unit':'μM','population':'China newborns (dried blood spots)',
                'platform':'MS/MS (NeoBase non-derivatized kit; Waters/AB Sciex)','sex':sex,'age':age,'n':r[o+2].replace(',',''),
                'lower':lo,'upper':up,'lower_ci':loci,'upper_ci':upci,'ci_level':'90%','flag':';'.join(x for x in(f1,f2) if x)})
if __name__=='__main__':
    out=[]
    p19(f'{RAW}/19_PMC9806292.xml',out);p6(f'{RAW}/6_PMC10756939.xml',out)
    p36(f'{RAW}/36_PMC8132375.xml',out);p26(f'{RAW}/26_PMC8716770.xml',out)
    with open('data/caliper-ri.csv','w',newline='',encoding='utf-8') as fh:
        w=csv.DictWriter(fh,COLS);w.writeheader();w.writerows(out)
    from collections import Counter
    print(len(out),Counter(o['paper_no'] for o in out))
    print('flagged:',[ (o['paper_no'],o['table_id'],o['analyte'],o['age'],o['flag']) for o in out if o['flag'] and o['paper_no']!=26][:20])
    print('flagged 26:',sum(1 for o in out if o['paper_no']==26 and o['flag']))

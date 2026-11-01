"""Build editable 16:9 decks and matching scripts from real app captures."""
from pathlib import Path
import sys,json,zipfile,re,hashlib
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR,PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement as PptElement
from docx import Document
from docx.shared import Inches as DI,Pt as DP,RGBColor as DC
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
from content import SLIDES5,SLIDES7,SOURCES,QA
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'files';OUT.mkdir(exist_ok=True)
IMG=ROOT/'screens'
NAVY='122B49';BLUE='245EEA';TEAL='007E88';PALE='EDF3FD';LIGHT='F6F8FC';GRAY='53677D';LINE='DCE5EF';WHITE='FFFFFF';ORANGE='C66B31'
FONT='Noto Sans CJK KR'
def rgb(h):return RGBColor.from_string(h)
def box(s,x,y,w,h,fill=WHITE,line=None,radius=False):
 a=s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h));a.fill.solid();a.fill.fore_color.rgb=rgb(fill);a.line.fill.background() if line is None else None
 if line:a.line.color.rgb=rgb(line);a.line.width=Pt(1)
 if radius:
  try:a.adjustments[0]=.1
  except:pass
 a._element.spPr.append(PptElement('a:effectLst'))
 return a
def txt(s,text,x,y,w,h,size=20,color=NAVY,bold=False,align=None):
 a=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));t=a.text_frame;t.word_wrap=True;t.margin_left=t.margin_right=0;t.margin_top=t.margin_bottom=0
 for i,line in enumerate(text.split('\n')):
  p=t.paragraphs[0] if i==0 else t.add_paragraph();p.text=line;p.font.name=FONT;p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=rgb(color);p.space_after=Pt(5);p.line_spacing=1.12
  if align is not None:p.alignment=align
 return a
def phone(s,name,x,y,w,h=None):
 path=IMG/(name+'.png');iw,ih=Image.open(path).size;h=h or w*ih/iw
 box(s,x-.055,y-.055,w+.11,h+.11,NAVY,radius=True)
 s.shapes.add_picture(str(path),Inches(x),Inches(y),width=Inches(w),height=Inches(h))
 return h
def header(s,item,n,total,minutes,dark=False):
 if dark:box(s,0,0,13.333,7.5,NAVY)
 color=WHITE if dark else NAVY
 txt(s,item['kicker'],.55,.35,11,.3,11, 'B4CAED' if dark else BLUE,True)
 txt(s,f'0713  /  {minutes} MIN',11.15,.35,1.65,.3,10,'B4CAED' if dark else GRAY,align=PP_ALIGN.RIGHT)
 txt(s,f'SYNEX HEALTH   ·   팀 0713',.55,7.1,9,.2,9,'B4CAED' if dark else GRAY)
 txt(s,f'{n:02d} / {total:02d}',11.65,7.07,1.1,.25,10,'B4CAED' if dark else GRAY,align=PP_ALIGN.RIGHT)
 if not dark:box(s,.55,6.96,12.23,.01,LINE)
def title(s,item,w=11):
 txt(s,item['title'],.55,1.0,w,1.3,33,NAVY,True)
 txt(s,item.get('subtitle',''),.57,2.42,11.8,.5,15,GRAY)
def badge(s,t,x,y,w=1.4,color=BLUE):
 box(s,x,y,w,.33,PALE,radius=True);txt(s,t,x+.10,y+.035,w-.2,.25,10,color,True)
def itemcard(s,k,b,x,y,w,h=2.1):
 box(s,x,y,w,h,LIGHT,line=LINE,radius=True);txt(s,k,x+.22,y+.22,w-.44,.55,21,BLUE,True);txt(s,b,x+.22,y+.94,w-.44,h-1.05,17,GRAY)
def footer_note(s,text):txt(s,text,.57,6.52,12,.35,10,GRAY)
def build_deck(slides,minutes):
 prs=Presentation();prs.slide_width=Inches(13.333);prs.slide_height=Inches(7.5)
 prs.core_properties.title=f'Synex Health · 팀 0713 · {minutes}분 발표';prs.core_properties.author='팀 0713';prs.core_properties.subject='제27회 강원특별자치도 대학생 창업경진대회'
 total=len(slides);elapsed=0
 for n,item in enumerate(slides,1):
  s=prs.slides.add_slide(prs.slide_layouts[6]);id=item['id']
  display=dict(item)
  if id not in ['cover','close']:display['kicker']=f'{n-1:02d} · '+item['kicker'].split(' · ',1)[1]
  header(s,display,n,total,minutes,id=='close')
  if id=='cover':
   txt(s,item['title'],.62,1.45,6.7,1.8,42,NAVY,True);txt(s,item['subtitle'],.65,3.55,5.7,1.15,21,GRAY)
   badge(s,'대학생 운동 코칭',.65,5.08,2.0);txt(s,'제27회 강원특별자치도\n대학생 창업경진대회',.65,5.63,6,1,16,GRAY)
   phone(s,'coach',7.15,1.3,2.35);phone(s,'home',9.68,.85,2.65)
  elif id=='problem':
   title(s,item)
   for i,(k,b) in enumerate(item['items']):itemcard(s,k,b,.58+i*4.13,3.35,3.87,2.35)
   footer_note(s,'문제는 고객 검증 가설입니다. 학생 15명 · 센터 담당자 3명 인터뷰를 계획합니다.')
  elif id=='flow':
   txt(s,item['title'],.55,1.03,4.3,1.65,32,NAVY,True);txt(s,'측정 결과를\n실행 가능한 행동으로\n연결하는 이용 흐름입니다.',.6,3.0,3.7,1.7,23,GRAY)
   for i,(name,cap) in enumerate([('body','01  내 몸 이해'),('coach','02  수행 확인'),('routine','03  계획·기록')]):
    x=5.0+i*2.62;txt(s,cap,x,.98,2.4,.42,17,BLUE,True);phone(s,name,x,1.6,2.18)
   footer_note(s,'실제 앱 캡처 · 예제 체성분 수치 · 카메라 패널은 권한 요청 전 화면입니다.')
  elif id=='coaching':
   phone(s,'coach',.72,.92,2.55);txt(s,item['title'],4.03,1.02,8.2,1.4,34,NAVY,True)
   for i,(k,b) in enumerate(item['items']):
    y=3.0+i*1.03;txt(s,f'0{i+1}',4.05,y,.6,.5,21,BLUE,True);txt(s,k,4.85,y,7.6,.45,21,NAVY,True);txt(s,b,4.85,y+.45,7.6,.5,16,GRAY)
   footer_note(s,'관찰 가능한 관절에 대한 안내입니다. 근육 활성도·통증 원인의 직접 측정이 아닙니다.')
  elif id=='competition':
   title(s,item)
   rows=[('Nike Training Club','트레이너 안내 · 운동 프로그램 · 회복·웰니스'),('Hevy','운동 기록 · 진행도 · 루틴·개인화 프로그램'),('Fitbod','목표·장비·수준에 맞춘 운동 계획'),('Synex Health','체성분 이해 → 수행 확인 → 기록·회복 → 기관 실증')]
   for i,(a,b) in enumerate(rows):
    y=3.08+i*.72;box(s,.58,y,12.17,.64,BLUE if i==3 else LIGHT,radius=True);txt(s,a,.8,y+.12,3.0,.43,18,WHITE if i==3 else NAVY,True);txt(s,b,4.0,y+.13,8.5,.44,17,WHITE if i==3 else GRAY)
   footer_note(s,'S3–S5 공식 소개의 중심 기능 비교입니다. 타 서비스의 기능 부재나 독점 기술을 주장하지 않습니다.')
  elif id=='customer':
   title(s,item)
   itemcard(s,'이용자','혼자 운동하는\n대학생 초보자',.6,3.15,3.5,2.15)
   itemcard(s,'구매 검토자','대학 스포츠센터·\n학생 건강관리 부서',4.55,3.15,3.75,2.15)
   box(s,8.75,3.15,4,2.15,BLUE,radius=True);txt(s,'첫 실증',9.02,3.4,3.4,.4,18,WHITE);txt(s,'기관 1곳',9.02,4.05,3.4,.7,36,WHITE,True)
   txt(s,'담당자 인터뷰  →  자발적 체험  →  4주 실증  →  유료 도입 협의',.7,5.8,12,.5,19,TEAL,True)
   footer_note(s,'현재 기관 계약·협약은 없습니다. 자동 연동에는 기관 승인·공식 API·사용자 동의가 필요합니다.')
  elif id=='validation':
   title(s,item)
   for i,(big,tag,body) in enumerate([('74 + 30','현재 콘텐츠','운동 74종\n스트레칭 30종'),('5종','우선 평가할 운동','대표 동작부터\n실제 영상 검증'),('20명','평가 참여자 계획','전문가 2인의\n독립 평가와 비교')]):
    x=.6+4.15*i;box(s,x,3.2,3.85,2.4,LIGHT,line=LINE,radius=True);txt(s,tag,x+.22,3.42,3.4,.35,15,GRAY);txt(s,big,x+.22,3.92,3.4,.75,39,BLUE,True);txt(s,body,x+.22,4.8,3.4,.65,16,GRAY)
   txt(s,'오류별 정밀도·재현율   /   잘못된 경고   /   판정 보류   /   기기별 지연',.65,5.96,12,.4,17,TEAL,True)
   footer_note(s,'구현 수와 자동 검사 통과는 실제 자세 분석 정확도를 입증하는 수치가 아닙니다.')
  elif id=='business':
   title(s,item)
   box(s,.62,3.12,4.05,2.82,BLUE,radius=True);txt(s,'기관 이용료 검증 범위',.88,3.43,3.5,.5,18,WHITE);txt(s,'월 10–30만 원',.88,4.2,3.5,.75,30,WHITE,True);txt(s,'이용 규모 · 지원 범위에 따라 협의',.88,5.2,3.5,.5,14,WHITE)
   txt(s,'월 20만 원 × 12개월 가정',5.2,3.24,7.2,.5,21,NAVY,True)
   for i,(label,value,width) in enumerate([('기관 1곳','240만 원',.75),('기관 5곳','1,200만 원',3.75)]):
    y=4.12+i*.85;txt(s,label,5.2,y,1.4,.4,17,GRAY);box(s,6.7,y,width,.38,TEAL if i==0 else BLUE,radius=True);txt(s,value,10.75,y-.02,2,.5,18,NAVY,True)
   txt(s,'초기 검증 예산 제안 500만 원',5.2,5.9,7.2,.45,19,TEAL,True)
   footer_note(s,'계약·매출 실적이 아닌 가정입니다. 부가세·비용 차감 전이며 창업자 인건비와 상용 전체 운영비는 별도입니다.')
  elif id=='roadmap':
   title(s,item)
   steps=[('2026.11–12','고객·가격 검증','학생 15명\n담당자 3명'),('2026.12–2027.01','자세·기기 평가','대표 운동 5종\n참여자 20명'),('2027.02–03','기관 1곳 실증','승인·API 확보 시\n4주 체험'),('2027.04–06','유료 도입 검토','이용 지속·운영비\n지불 의향 확인')]
   for i,(date,k,b) in enumerate(steps):
    x=.6+i*3.13;badge(s,date,x,3.12,2.83);itemcard(s,k,b,x,3.64,2.87,1.97)
   txt(s,'팀 역할   개발·검증  +  기획·고객 조사',.65,5.94,6.2,.45,18,BLUE,True)
   txt(s,'보완 계획   운동 전문가 평가 · 계약·개인정보 검토',6.6,5.96,6.1,.45,15,GRAY)
   footer_note(s,'목표: 첫 운동 완료율 70% / 4주차 재사용률 30%. 현재 성과가 아닌 검증 목표이며 일정은 조건에 따라 조정합니다.')
  elif id=='close':
   txt(s,item['title'],.7,1.55,11.8,1.75,43,WHITE,True);txt(s,item['subtitle'],.75,3.9,11.7,.8,24,'C9DCF6')
   for i,t in enumerate(['실증 파트너 1곳','운동 전문가 평가','유료 도입 의향 검증']):
    box(s,.75+i*4.16,5.4,3.82,.73,'203F65',radius=True);txt(s,t,.95+i*4.16,5.6,3.42,.4,18,WHITE,True)
  t=item['seconds'];start=f'{elapsed//60:02d}:{elapsed%60:02d}';elapsed+=t;end=f'{elapsed//60:02d}:{elapsed%60:02d}'
  s.notes_slide.notes_text_frame.text=f'발표 구간 {start}–{end} / {t}초 목표\n\n{item["script"]}\n\n발표자 메모: 실제 말하기 속도에 따라 리허설에서 조정합니다. 계획·가정을 실적으로 바꾸어 읽지 않습니다.\n출처: '+'\n'.join(f'{key} · {label}: {detail}\n{url}' for key,label,detail,url in SOURCES)
 file=OUT/f'Synex_0713_{minutes}min.pptx';prs.save(file);return file

def setup_doc(doc):
 sec=doc.sections[0];sec.top_margin=DI(.7);sec.bottom_margin=DI(.65);sec.left_margin=sec.right_margin=DI(.8)
 style=doc.styles['Normal'];style.font.name=FONT;style.font.size=DP(10.5);style.paragraph_format.space_after=DP(7)
 style.element.rPr.rFonts.set(qn('w:eastAsia'),FONT)
 for name in ['Title','Heading 1','Heading 2']:
  s=doc.styles[name];s.font.name=FONT;s.element.rPr.rFonts.set(qn('w:eastAsia'),FONT);s.font.color.rgb=DC.from_string(BLUE if name=='Heading 2' else NAVY)
 footer=sec.footer.paragraphs[0];footer.text='TEAM 0713  |  SYNEX HEALTH  ·  발표 연습용  |  ';footer.style=doc.styles['Caption']
 field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');footer._p.append(field)
def build_script(slides,minutes):
 doc=Document();setup_doc(doc);doc.add_heading(f'Synex Health\n{minutes}분 발표 대본',0);doc.add_paragraph('팀 0713 · 제27회 강원특별자치도 대학생 창업경진대회');doc.add_paragraph(f'주 발표 {len(slides)}장 / 목표 {minutes}:00 / 예상 질의응답 20개',style='Subtitle')
 doc.add_heading('읽기 전 확인',1);doc.add_paragraph('대본의 장 번호는 같은 이름의 PPT와 일치합니다. 장별 시간은 리허설용 목표이며 실제 낭독 시간을 측정한 값은 아닙니다. 7분 결선은 공고문상 질의응답 3분이 별도입니다. 모든 화면은 실제 앱 캡처이며 수치는 예제입니다. 계획과 가정을 실적처럼 읽지 않습니다.')
 elapsed=0;md=[f'# 팀 0713 · Synex Health {minutes}분 발표 대본','',f'주 발표 {len(slides)}장. 목표 시간 {minutes}:00. 장별 시간은 리허설 기준입니다.','']
 for i,s in enumerate(slides,1):
  start=f'{elapsed//60:02d}:{elapsed%60:02d}';elapsed+=s['seconds'];end=f'{elapsed//60:02d}:{elapsed%60:02d}'
  h=f'{i:02d}. {s["title"].replace(chr(10)," ")}  [{start}–{end}]';doc.add_heading(h,1);doc.add_paragraph(s['script']);md.extend([f'## {h}','',s['script'],''])
 doc.add_page_break();doc.add_heading('예상 질의응답 20개',0);doc.add_paragraph('각 답변은 핵심 결론부터 20~30초 안에 말하고 추가 질문이 있을 때 근거를 설명하는 연습용입니다. 아래 계획 수치는 확정 실적이 아닙니다.');md.extend(['# 예상 질의응답 20개',''])
 for i,(q,a) in enumerate(QA,1):
  doc.add_heading(f'Q{i:02d}. {q}',2);doc.add_paragraph(a);md.extend([f'## Q{i:02d}. {q}','',a,''])
 doc.add_page_break();doc.add_heading('근거와 자료 · 출처·사실 확인표',0);md.extend(['# 근거와 자료 · 출처·사실 확인표',''])
 for key,label,detail,url in SOURCES:doc.add_heading(key+' · '+label,2);doc.add_paragraph(detail);doc.add_paragraph(url);md.extend([f'- {key} · {label}: {detail} — {url}'])
 path=OUT/f'Synex_0713_{minutes}min_script_QA.docx';doc.save(path);(OUT/f'Synex_0713_{minutes}min_script_QA.md').write_text('\n'.join(md));return path
if __name__=='__main__':
 for minutes,slides in [(5,SLIDES5),(7,SLIDES7)]:
  assert sum(s['seconds'] for s in slides)==minutes*60;assert len(QA)==20
  print(build_deck(slides,minutes));print(build_script(slides,minutes))

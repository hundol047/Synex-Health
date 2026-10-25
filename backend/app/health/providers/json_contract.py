"""Declarative, read-only JSON measurement API. Paths/units come from official specs.

No scripts, expression evaluation, remote schemas, or inferred vendor fields.
"""
from copy import deepcopy
from datetime import datetime
import math
from urllib.parse import quote
from .inbody import MeasurementRequest


def at(value, pointer):
    if not isinstance(pointer,str) or (pointer and not pointer.startswith('/')):
        raise ValueError('Use a JSON pointer')
    for key in pointer.split('/')[1:]:
        key=key.replace('~1','/').replace('~0','~')
        value=value[int(key)] if isinstance(value,list) else value[key]
    return value


def only(value, keys):
    if not isinstance(value,dict) or set(value)-set(keys):raise ValueError('Unknown contract setting')


MASS={'kg':1,'g':.001,'lb':.45359237}
LENGTH={'cm':1,'m':100,'mm':.1,'in':2.54}
PERCENT={'percent':1,'fraction':100}
UNITS={**{k:MASS for k in ('weight','skeletal_muscle_mass','body_fat_mass','fat_free_mass','total_body_water','bone_mass','mineral_mass','lean_mass_kg','fat_mass_kg')},
       **{k:LENGTH for k in ('height','waist_circumference','chest_circumference','hip_circumference')},
       **{k:PERCENT for k in ('body_fat_percentage','lean_reference_percent','fat_reference_percent')},
       'bmi':{'kg/m2':1},'smi':{'kg/m2':1},'basal_metabolic_rate':{'kcal/day':1},'visceral_fat_level':{'level':1}}
SEGMENT_FIELDS={'lean_mass_kg','fat_mass_kg','lean_reference_percent','fat_reference_percent'}
BODY_FIELDS=set(UNITS)-SEGMENT_FIELDS


class JsonMeasurementContract:
    def __init__(self, config):
        only(config,{'request','records_path','subject_path','fields','segments','constants','pagination'})
        self.config=deepcopy(config)
        request=config['request']
        only(request,{'path','method','subject_location','subject_key','params','json'})
        path=request['path']
        if not isinstance(path,str) or not path.startswith('/') or path.startswith('//') or any(c in path for c in ('..',':','\\','?','#','\r','\n')):raise ValueError('Invalid relative query path')
        if request.get('method','GET') not in ('GET','POST'):raise ValueError('Only read-only GET/POST contracts are supported')
        location=request['subject_location']
        if location not in ('query','body','path'):raise ValueError('Invalid subject location')
        if location=='body' and request.get('method','GET')!='POST':raise ValueError('Body subject requires POST')
        if location=='path' and path.count('{subject}')!=1:raise ValueError('Path requires one subject placeholder')
        if location!='path' and (not isinstance(request.get('subject_key'),str) or not request['subject_key']):raise ValueError('Subject key required')
        if request.get('method','GET')=='GET' and request.get('json') is not None:raise ValueError('GET cannot have a JSON body')
        for key in ('params','json'):
            if request.get(key) is not None and not isinstance(request[key],dict):raise ValueError('Request values must be objects')
        for key in ('records_path','subject_path'):
            if not isinstance(config[key],str) or config[key] and not config[key].startswith('/'):raise ValueError('JSON pointer required')
        fields=config['fields'];only(fields,BODY_FIELDS|{'external_id','measurement_date'})
        if not {'external_id','measurement_date'}<=fields.keys() or not BODY_FIELDS.intersection(fields):raise ValueError('ID, date and a measurement required')
        for name,field in fields.items():self._validate_field(name,field)
        segments=config.get('segments',[])
        if not isinstance(segments,list) or len(segments)>5:raise ValueError('Invalid segments')
        seen=set()
        for segment in segments:
            only(segment,{'segment','fields'})
            if segment['segment'] not in ('LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG','TRUNK') or segment['segment'] in seen:raise ValueError('Invalid or duplicate segment')
            seen.add(segment['segment']);only(segment['fields'],SEGMENT_FIELDS)
            for name,field in segment['fields'].items():self._validate_field(name,field)
        only(config.get('constants',{}),{'device_name','measurement_method'})
        if any(not isinstance(v,str) or len(v)>200 for v in config.get('constants',{}).values()):raise ValueError('Invalid constants')
        pagination=config.get('pagination')
        self.max_pages=1
        if pagination is not None:
            only(pagination,{'location','request_key','next_cursor_path','max_pages'})
            if pagination['location'] not in ('query','body') or pagination['location']=='body' and request.get('method','GET')!='POST':raise ValueError('Invalid cursor location')
            if not isinstance(pagination['request_key'],str) or not pagination['request_key'] or pagination['request_key']==request.get('subject_key'):raise ValueError('Cursor must not replace subject')
            if not isinstance(pagination['next_cursor_path'],str) or not pagination['next_cursor_path'].startswith('/'):raise ValueError('Cursor JSON pointer required')
            self.max_pages=pagination.get('max_pages',20)
            if type(self.max_pages) is not int or not 1<=self.max_pages<=50:raise ValueError('Invalid page limit')

    def _validate_field(self,name,field):
        only(field,{'path','unit','required','date_format'})
        if not isinstance(field.get('path'),str) or not field['path'].startswith('/'):raise ValueError('Field JSON pointer required')
        if 'required' in field and type(field['required']) is not bool:raise ValueError('Required must be boolean')
        if name in UNITS and field.get('unit') not in UNITS[name]:raise ValueError('Explicit compatible unit required')
        if name!='measurement_date' and 'date_format' in field:raise ValueError('Date format applies only to measurement date')

    def request(self, external_subject):
        c=self.config['request'];params=deepcopy(c.get('params',{}));body=deepcopy(c.get('json',{}));path=c['path']
        if c['subject_location']=='path':path=path.replace('{subject}',quote(external_subject,safe=''))
        else:(params if c['subject_location']=='query' else body).__setitem__(c['subject_key'],external_subject)
        return MeasurementRequest(path,c.get('method','GET'),params,body if c.get('method','GET')=='POST' else None)

    def readings(self,response):
        rows=at(response,self.config['records_path'])
        if not isinstance(rows,list) or not all(isinstance(row,dict) for row in rows):raise ValueError('Measurement list required')
        return rows

    def verify_subject(self, raw, subject):
        actual=at(raw,self.config['subject_path'])
        if type(actual) not in (str,int) or str(actual)!=subject:raise ValueError('Measurement subject mismatch')

    def next_request(self,response,previous):
        p=self.config.get('pagination')
        if p is None:return None
        # A missing cursor is a malformed page, not evidence that import ended.
        cursor=at(response,p['next_cursor_path'])
        if cursor is None or cursor=='':return None
        if type(cursor) not in (str,int) or len(str(cursor))>2000:raise ValueError('Invalid cursor')
        params=deepcopy(previous.params or {});body=deepcopy(previous.json or {})
        (params if p['location']=='query' else body)[p['request_key']]=cursor
        return MeasurementRequest(previous.path,previous.method,params,body if previous.method=='POST' else None)

    def _value(self,raw,name,field):
        try:value=at(raw,field['path'])
        except (KeyError,IndexError):
            if field.get('required',name in ('external_id','measurement_date')):raise ValueError('Required field missing') from None
            return None
        if value is None:
            if field.get('required',name in ('external_id','measurement_date')):raise ValueError('Required field missing')
            return None
        if name=='external_id':
            if type(value) not in (str,int):raise ValueError('Invalid measurement ID')
            return str(value)
        if name=='measurement_date':
            if not isinstance(value,str):raise ValueError('Invalid measurement date')
            fmt=field.get('date_format','iso')
            return (datetime.fromisoformat(value.replace('Z','+00:00')) if fmt=='iso' else datetime.strptime(value,fmt)).date().isoformat()
        if isinstance(value,bool) or not isinstance(value,(str,int,float)):raise ValueError('Numeric field required')
        result=float(value)*UNITS[name][field['unit']]
        if not math.isfinite(result):raise ValueError('Finite field required')
        return result

    def normalize(self,raw):
        values={name:self._value(raw,name,field) for name,field in self.config['fields'].items()}
        external_id=values.pop('external_id')
        if not any(values.get(name) is not None for name in BODY_FIELDS):raise ValueError('Empty measurement')
        values.update(self.config.get('constants',{}))
        values['segments']=[]
        for segment in self.config.get('segments',[]):
            fields={name:self._value(raw,name,field) for name,field in segment['fields'].items()}
            if any(value is not None for value in fields.values()):values['segments'].append({'segment':segment['segment'],**fields})
        return external_id,values

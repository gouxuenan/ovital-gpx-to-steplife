'use strict';
const $=id=>document.getElementById(id);
let track=null, revision=0;
let timeMode='end';
const formatTime=seconds=>new Date(seconds*1000+28800000).toISOString().slice(0,19).replace('T',' ');
$('start').value='2019-11-30T08:00:00';
$('end').value='2019-11-30T18:00:00';
function resolveTiming(){
  const start=GPXConverter.startTimestamp($('start').value), gaps=track.count-1;
  if(gaps===0){
    $('end').value=formatTime(start).replace(' ','T');$('interval').value='0';
    $('interval').disabled=true;return {start,interval:1};
  }
  $('interval').disabled=false;
  if(timeMode==='end'){
    let end;try{end=GPXConverter.startTimestamp($('end').value);}catch{throw new Error('请填写有效的结束时间。');}
    if(end<=start)throw new Error('结束时间必须晚于开始时间。');
    const interval=(end-start)/gaps;
    $('interval').value=String(Number(interval.toPrecision(12)));
    return {start,interval};
  }
  const interval=Number($('interval').value);
  if(!Number.isInteger(interval)||interval<=0)throw new Error('手动设置的采样间隔必须为正整数秒。');
  const end=start+Math.round(gaps*interval);
  if(end>253402271999||!Number.isFinite(new Date(end*1000).getTime()))throw new Error('结束时间超出支持范围，请减小间隔。');
  $('end').value=formatTime(end).replace(' ','T');
  return {start,interval};
}
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
function refresh(){
  $('export').disabled=true;
  if(!track)return null;
  try{
    const timing=resolveTiming();
    const result=GPXConverter.convert(track,timing.start,timing.interval);
    GPXConverter.filename($('output').value);
    $('points').textContent=result.count.toLocaleString();
    $('speed').textContent=result.duration>0?(result.total/result.duration*3.6).toFixed(1):'—';
    $('speed').title='总里程（公里）÷ 总时长（小时），不修改 CSV speed 字段。';
    $('distance').textContent=(result.total/1000).toFixed(3)+' km';
    const t=result.duration;$('duration').textContent=`${Math.floor(t/3600)}时 ${Math.floor(t%3600/60)}分 ${t%60}秒`;
    $('start-view').textContent=formatTime(result.start);$('end-view').textContent=formatTime(result.end);
    $('export').disabled=false;
    status(track.count===1?'仅有一个轨迹点，结束时间等于开始时间。':timing.interval<1?'间隔小于 1 秒，整数秒时间戳会有重复，App 可能合并这些点。':'已准备好，可导出 CSV。');return result;
  }catch(e){$('speed').textContent='—';$('duration').textContent='—';$('start-view').textContent='—';$('end-view').textContent='—';status(e.message,true);return null;}
}
function draw(){
  const svg=$('route');svg.replaceChildren();
  const points=track.segments.flat(), minLat=points.reduce((v,p)=>Math.min(v,p.lat),90),maxLat=points.reduce((v,p)=>Math.max(v,p.lat),-90);
  const minLon=points.reduce((v,p)=>Math.min(v,p.lon),180),maxLon=points.reduce((v,p)=>Math.max(v,p.lon),-180);
  const cos=Math.max(.01,Math.cos((minLat+maxLat)/2*Math.PI/180));
  const width=(maxLon-minLon)*cos,height=maxLat-minLat,scale=Math.min(540/(width||1e-9),240/(height||1e-9));
  const xy=p=>[300+((p.lon-minLon)*cos-width/2)*scale,150-(p.lat-minLat-height/2)*scale];
  function element(name,attrs){const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));svg.appendChild(el);}
  for(const segment of track.segments)element('polyline',{points:segment.map(p=>xy(p).join(',')).join(' '),fill:'none',stroke:'#397d59','stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'});
  for(const [p,color] of [[points[0],'#397d59'],[points.at(-1),'#df9457']]){const [cx,cy]=xy(p);element('circle',{cx,cy,r:5,fill:color,stroke:'#fff','stroke-width':2});}
  $('empty').hidden=true;
}
$('gpx').addEventListener('change',async()=>{
  const current=++revision,file=$('gpx').files[0];track=null;$('export').disabled=true;$('route').replaceChildren();$('empty').hidden=false;
  for(const id of ['points','speed','distance','duration','start-view','end-view'])$(id).textContent='—';$('details').textContent='';
  if(!file){$('file-name').textContent='支持奥维等软件导出的 .gpx 文件';status('请选择一份 GPX 文件开始。');return;}
  $('file-name').textContent=file.name;status('正在读取轨迹…');
  try{
    if(file.size>50*1024*1024)throw new Error('文件超过 50 MB，请先拆分轨迹后再导入。');
    const text=await file.text();if(current!==revision)return;
    track=GPXConverter.parseGPX(text);$('output').value=file.name.replace(/\.gpx$/i,'')+'_一生足迹';
    $('details').textContent=`${track.timed} 个点带有原始时间（导出时替换）；${track.missingElevation} 个点缺少海拔（填 0）。`;
    draw();refresh();
  }catch(e){if(current===revision){track=null;status(e.message,true);}}
});
for(const id of ['start','end'])$(id).addEventListener('input',()=>{timeMode='end';refresh();});
$('interval').addEventListener('input',()=>{timeMode='interval';refresh();});
$('output').addEventListener('input',refresh);
$('settings').addEventListener('submit',event=>{
  event.preventDefault();const result=refresh();if(!result)return;
  const blob=new Blob([result.csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=GPXConverter.filename($('output').value);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  status(`已发起下载：${a.download}，共 ${result.count} 个点。`);
});

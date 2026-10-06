/* Standalone conversion logic. No network requests or external libraries. */
(function (root) {
  'use strict';
  const HEADER = 'dataTime,locType,longitude,latitude,heading,accuracy,speed,distance,isBackForeground,stepType,altitude';
  function distance(a, b) {
    const r = Math.PI / 180, p = (b.lat-a.lat)*r, q = (b.lon-a.lon)*r;
    const h = Math.sin(p/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(q/2)**2;
    return 12742000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }
  function parseGPX(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'gpx') throw new Error('文件不是有效的 GPX XML，请检查文件内容。');
    const descendants = (el, name) => Array.from(el.getElementsByTagNameNS('*', name));
    const groups = [];
    for (const track of descendants(doc, 'trk')) for (const segment of descendants(track, 'trkseg')) groups.push(descendants(segment, 'trkpt'));
    if (!groups.some(g => g.length)) for (const route of descendants(doc, 'rte')) groups.push(descendants(route, 'rtept'));
    let count = 0, missingElevation = 0, timed = 0;
    const segments = groups.filter(g => g.length).map(group => group.map(el => {
      count++;
      const latText = el.getAttribute('lat'), lonText = el.getAttribute('lon');
      const lat = Number(latText), lon = Number(lonText);
      if (!latText?.trim() || !lonText?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) throw new Error(`第 ${count} 个点的经纬度无效，已停止转换。`);
      const elevation = descendants(el,'ele')[0]?.textContent.trim();
      const altitude = elevation ? Number(elevation) : 0;
      if (!Number.isFinite(altitude)) throw new Error(`第 ${count} 个点的海拔无效。`);
      if (!elevation) missingElevation++;
      if (descendants(el,'time')[0]?.textContent.trim()) timed++;
      return {lat, lon, latText:latText.trim(), lonText:lonText.trim(), altitude};
    }));
    if (!count) throw new Error('未找到轨迹点（trkpt）或路线点（rtept）。');
    return {segments, count, missingElevation, timed};
  }
  function startTimestamp(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) throw new Error('请填写完整的开始时间。');
    const normalized = value.length === 16 ? value + ':00' : value;
    const ms = Date.parse(normalized + '+08:00');
    if (!Number.isFinite(ms) || new Date(ms+28800000).toISOString().slice(0,19) !== normalized) throw new Error('开始时间无效。');
    return ms/1000;
  }
  function convert(track, start, interval) {
    if (!Number.isInteger(start) || !Number.isFinite(interval) || interval<=0) throw new Error('采样间隔必须为大于 0 的秒数。');
    const rows = [HEADER]; let index=0,total=0;
    for (const segment of track.segments) {
      let prev=null;
      for (const point of segment) {
        const d=prev ? distance(prev,point) : 0; total+=d;
        rows.push([start+Math.round(index*interval),1,point.lonText,point.latText,'0.000000','10.000000','10.000000',d.toFixed(6),1,0,point.altitude.toFixed(6)].join(','));
        prev=point; index++;
      }
    }
    const end=start+Math.round((index-1)*interval);
    if (!index || !Number.isFinite(new Date(end*1000).getTime()) || end>253402271999) throw new Error('输出时间超出支持范围，请调整开始时间或间隔。');
    return {csv:'\ufeff'+rows.join('\r\n')+'\r\n',total,count:index,start,end,duration:end-start};
  }
  function filename(value) {
    const name=value.trim().replace(/\.csv$/i,'');
    if (!name || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw new Error('导出名称无效，请避免特殊字符和系统保留名称。');
    return name+'.csv';
  }
  const api={HEADER,distance,parseGPX,startTimestamp,convert,filename};
  root.GPXConverter=api;
  if (typeof module !== 'undefined') module.exports=api;
})(globalThis);

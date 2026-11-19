const rad = Math.PI / 180;
export function distanceKm([a, b], [c, d]) {
  const h = Math.sin((c - a) * rad / 2) ** 2 +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((d - b) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function findFacilities(rows, { query, position, gyms, date }) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const found = [];
  for (const [name, address, detail, start, end, area] of rows) {
    if ((start && start > date) || (end && end < date)) continue;
    if (gyms && !/헬스|휘트니스|피트니스|핏니스|체력단련|웨이트|짐|fitness|gym|(?:^|[^a-z])pt(?:[^a-z]|$)|피티/i.test(name)) continue;
    const label = [name, address, detail].join(" ").toLocaleLowerCase();
    if (!words.every(word => label.includes(word))) continue;
    const distance = position && area ? distanceKm(position, area) : null;
    if (position && !words.length && (distance === null || distance > 30)) continue;
    found.push({ name, address, detail, distance, areaName: area?.[2] });
  }
  return position ? found.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) : found;
}

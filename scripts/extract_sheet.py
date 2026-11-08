"""Extract chart master data from the Rotaeno Rating analysis sheet (xlsx).

Usage: python3 -I scripts/extract_sheet.py <sheet.xlsx> <out_dir>
Writes charts.json, constant-history.json and meta.json.
"""
import collections, json, re, sys
import openpyxl

DIFFS = ['I', 'II', 'III', 'IV', 'IV-α']


def level_label(c):
    base = int(c)
    return f"{base}+" if c >= 10 and round(c - base, 1) >= 0.6 else str(base)


def main(src, out):
    wb = openpyxl.load_workbook(src, data_only=False)
    guide = wb.worksheets[0]
    title = next(str(c.value) for row in guide.iter_rows() for c in row if isinstance(c.value, str) and 'ver' in c.value)
    version = re.search(r'ver\s*([\d.]+)', title).group(1)
    theoretical = None
    for row in guide.iter_rows(values_only=True):
        vals = [v for v in row if v is not None]
        if len(vals) >= 2 and isinstance(vals[0], str) and vals[0].startswith('理论rating'):
            theoretical = vals[1]
            break

    ws = wb['在这里填分数']
    head = [c.value for c in ws[1]]
    col = {h: i for i, h in enumerate(head)}
    charts = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[col['曲名']] is None:
            continue
        diff = row[col['难度']]
        assert diff in DIFFS, diff
        song_id = str(row[col['歌曲ID']]).strip()
        c = float(row[col['定数']])
        charts.append({
            'id': f"{song_id}:{diff}",
            'songId': song_id,
            'title': str(row[col['曲名']]).strip(),
            'difficulty': diff,
            'constant': round(c, 1),
            'level': level_label(c),
            'pack': str(row[col['曲包']]).strip(),
            'version': str(row[col['版本']]).strip(),
            'defaultOrder': int(row[col['默认序号']]),
            'updateOrder': int(row[col['更新序号']]),
            'deleted': row[col['是否下架']] == 1,
        })

    # song-level title = IV title (α may carry a variant title)
    songs = collections.defaultdict(list)
    for ch in charts:
        songs[ch['songId']].append(ch)
    for sid, chs in songs.items():
        base = next(ch for ch in chs if ch['difficulty'] == 'IV')
        pack = collections.Counter(ch['pack'] for ch in chs).most_common(1)[0][0]
        for ch in chs:
            ch['songTitle'] = base['title']
            ch['songPack'] = pack
    assert len({c['id'] for c in charts}) == len(charts)

    # 定数编年史 (constant history before major revisions)
    hs = wb['定数编年史']
    hrows = list(hs.iter_rows(values_only=True))
    header_idx = next(i for i, r in enumerate(hrows) if r and r[0] == '曲名')
    header = hrows[header_idx]
    eras = [str(h) for h in header[3:]]
    by_title = {(c['title'], c['difficulty']): c['id'] for c in charts}
    by_song_title = {(c['songTitle'], c['difficulty']): c['id'] for c in charts}
    history, unmatched = [], []
    for r in hrows[header_idx + 1:]:
        if not r or r[0] is None:
            continue
        t, d = str(r[0]).strip(), str(r[1]).strip()
        cid = by_title.get((t, d)) or by_song_title.get((t, d))
        if cid is None:
            unmatched.append((t, d))
        history.append({'chartId': cid, 'title': t, 'difficulty': d, 'addedVersion': str(r[2]).strip() if r[2] else None,
                        'values': [None if v is None else float(v) for v in r[3:3 + len(eras)]]})

    meta = {'gameVersion': version, 'theoreticalRating': theoretical, 'chartCount': len(charts),
            'songCount': len(songs), 'deletedCharts': sum(c['deleted'] for c in charts),
            'source': 'Rotaeno 新时代Rating分析表 (Artis+)', 'historyEras': eras}
    charts.sort(key=lambda c: c['defaultOrder'])
    json.dump(charts, open(f'{out}/charts.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump({'eras': eras, 'rows': history}, open(f'{out}/constant-history.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump(meta, open(f'{out}/meta.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(json.dumps(meta, ensure_ascii=False))
    print('history rows', len(history), 'unmatched', len(unmatched), unmatched[:10])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

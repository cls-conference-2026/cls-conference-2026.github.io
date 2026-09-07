#!/usr/bin/env python3
"""
CLS Conference 2026 Timetable Scraper (Python Version)
Scrapes schedule data from https://cls.ucl.ac.uk/events/cls-conference-2026/ into timetable.csv
"""

import os
import re
import csv
import urllib.request
import html

URL = "https://cls.ucl.ac.uk/events/cls-conference-2026/"
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "timetable.csv")

ROOM_MAP = [
    "Hallam Room 1",
    "Hallam Room 2",
    "Hallam Room 3",
    "Hallam Room 4"
]

def clean_text(text):
    if not text:
        return ""
    t = re.sub(r'<[^>]+>', ' ', text)
    t = html.unescape(t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def scrape():
    print(f"Fetching {URL}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        req = urllib.request.Request(URL, headers=headers)
        with urllib.request.urlopen(req) as resp:
            page_html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"Could not fetch URL live ({e}). Checking local fallbacks...")
        fallback_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "content.md")
        if os.path.exists(fallback_path):
            with open(fallback_path, 'r', encoding='utf-8') as f:
                page_html = f.read()
        else:
            raise

    item_pattern = re.compile(
        r'<article class="[^"]*simple-agenda-item[^"]*">.*?'
        r'<div class="simple-agenda-item__time">(.*?)</div>.*?'
        r'<div class="simple-agenda-item__title">(.*?)</div>.*?'
        r'<div class="simple-agenda-item__description">(.*?)</div>\s*</div>\s*</article>',
        re.DOTALL
    )

    items = item_pattern.findall(page_html)
    print(f"Found {len(items)} agenda blocks.")

    records = []
    id_counter = 1
    current_day = "Day 1"
    current_date = "2026-09-22"
    last_time = ""

    for time_raw, title_raw, desc_raw in items:
        time_str = clean_text(time_raw)
        title_str = clean_text(title_raw)

        if last_time and last_time >= "16:00" and time_str <= "09:30":
            current_day = "Day 2"
            current_date = "2026-09-23"
        last_time = time_str

        default_room = "Main Hallam Auditorium"
        if 'Regent Suite' in desc_raw:
            default_room = "Cavendish Lounge"
        elif 'Council Chamber' in desc_raw:
            default_room = "Main Hallam Auditorium"

        session_type = "General"
        if "Keynote" in title_str:
            session_type = "Keynote"
        elif "Parallel" in title_str:
            session_type = "Parallel Sessions"
        elif "Registration" in title_str:
            session_type = "Registration"
        elif any(k in title_str for k in ["Break", "Refreshments", "Lunch"]):
            session_type = "Break"
        elif "Poster" in title_str:
            session_type = "Poster Session"
        elif any(k in title_str for k in ["Welcome", "Close", "Instructions"]):
            session_type = "Plenary"

        acc_pattern = re.compile(
            r'<p class="nfh_accordion2_trigger"[^>]*>(.*?)</p>\s*<div class="nfh_accordion2_content"[^>]*>(.*?)</div>',
            re.DOTALL
        )
        accordions = acc_pattern.findall(desc_raw)

        if accordions:
            for acc_idx, (acc_title_raw, acc_content_raw) in enumerate(accordions):
                track_title = clean_text(acc_title_raw)
                track_room = ROOM_MAP[acc_idx % len(ROOM_MAP)]

                abstract_url = ""
                abs_match = re.search(r'href="([^"]*abstracts[^"]*)"', acc_content_raw)
                if abs_match:
                    abstract_url = html.unescape(abs_match.group(1))

                li_pattern = re.compile(r'<li>(.*?)</li>', re.DOTALL)
                lis = li_pattern.findall(acc_content_raw)

                if lis:
                    for li_raw in lis:
                        li_text = clean_text(li_raw)
                        pres_title = li_text
                        speaker = ""
                        affiliation = ""

                        m_bracket = re.match(r'^(.*?)\((.*?)\)$', li_text)
                        if m_bracket:
                            pres_title = m_bracket.group(1).strip()
                            spk_aff = m_bracket.group(2).strip()
                            if ',' in spk_aff:
                                parts = spk_aff.split(',', 1)
                                speaker = parts[0].strip()
                                affiliation = parts[1].strip()
                            else:
                                speaker = spk_aff

                        records.append({
                            'id': f"SES-{id_counter:03d}",
                            'day': current_day,
                            'date': current_date,
                            'time_start': time_str,
                            'time_end': '',
                            'session_block': title_str,
                            'track_session': track_title,
                            'room': track_room,
                            'session_type': session_type,
                            'presentation_title': pres_title,
                            'speaker': speaker,
                            'affiliation': affiliation,
                            'abstract_url': abstract_url,
                            'notes_description': f"Track: {track_title}",
                            'status': 'Confirmed'
                        })
                        id_counter += 1
                else:
                    records.append({
                        'id': f"SES-{id_counter:03d}",
                        'day': current_day,
                        'date': current_date,
                        'time_start': time_str,
                        'time_end': '',
                        'session_block': title_str,
                        'track_session': track_title,
                        'room': track_room,
                        'session_type': session_type,
                        'presentation_title': track_title,
                        'speaker': '',
                        'affiliation': '',
                        'abstract_url': abstract_url,
                        'notes_description': clean_text(acc_content_raw),
                        'status': 'Confirmed'
                    })
                    id_counter += 1
        else:
            desc_clean = clean_text(desc_raw)
            speaker = ""
            affiliation = ""
            abstract_url = ""

            abs_match = re.search(r'href="([^"]*abstracts[^"]*)"', desc_raw)
            if abs_match:
                abstract_url = html.unescape(abs_match.group(1))

            spk_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(.*)', desc_clean)
            if spk_match:
                speaker = spk_match.group(1)
                affiliation = spk_match.group(2).replace('Council Chamber', '').replace('Regent Suite', '').strip()

            records.append({
                'id': f"SES-{id_counter:03d}",
                'day': current_day,
                'date': current_date,
                'time_start': time_str,
                'time_end': '',
                'session_block': title_str,
                'track_session': title_str,
                'room': default_room,
                'session_type': session_type,
                'session_chair': '',
                'presentation_title': title_str,
                'speaker': speaker,
                'affiliation': affiliation,
                'abstract_url': abstract_url,
                'campaign_url': '',
                'notes_description': desc_clean,
                'status': 'Confirmed'
            })
            id_counter += 1

    fieldnames = [
        'id', 'day', 'date', 'time_start', 'time_end', 'session_block',
        'track_session', 'room', 'session_type', 'session_chair', 'presentation_title',
        'speaker', 'affiliation', 'abstract_url', 'campaign_url', 'notes_description', 'status'
    ]

    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Scraped {len(records)} records into {OUTPUT_FILE}")

if __name__ == '__main__':
    scrape()

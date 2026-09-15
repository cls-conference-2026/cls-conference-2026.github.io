/* ==========================================================================
   CLS Conference 2026 - Expandable Session Group Logic (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    allSessions: [],
    filteredSessions: [],
    activeDay: 'all',
    searchQuery: '',
    selectedRoom: 'all',
    selectedType: 'all',
    expandAllState: false,
    onlyBookmarks: false,
    bookmarks: new Set(JSON.parse(localStorage.getItem('cls_bookmarks') || '[]')),
    activeSession: null
  };

  // DOM Element Selectors
  const scheduleContainer = document.getElementById('schedule-container');
  const searchInput = document.getElementById('search-input');
  const roomFilterSelect = document.getElementById('filter-room');
  const typePillBtns = document.querySelectorAll('#session-type-pills .pill-btn');
  const dayTabBtns = document.querySelectorAll('.day-tab-btn');
  
  const countAll = document.getElementById('count-all');
  const countDay1 = document.getElementById('count-day1');
  const countDay2 = document.getElementById('count-day2');
  const countSpeakers = document.getElementById('count-speakers');
  const bookmarkBadgeCount = document.getElementById('bookmark-badge-count');
  
  const btnBookmarks = document.getElementById('btn-bookmarks');
  const expandAllBtn = document.getElementById('btn-expand-all');

  // Modal Elements
  const sessionModal = document.getElementById('session-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalRoomTag = document.getElementById('modal-room-tag');
  const modalTitle = document.getElementById('modal-title');
  const modalDay = document.getElementById('modal-day');
  const modalTime = document.getElementById('modal-time');
  const modalType = document.getElementById('modal-type');
  const modalSpeakerBox = document.getElementById('modal-speaker-box');
  const modalSpeakerAvatar = document.getElementById('modal-speaker-avatar');
  const modalSpeakerName = document.getElementById('modal-speaker-name');
  const modalSpeakerAff = document.getElementById('modal-speaker-aff');
  const modalTrackName = document.getElementById('modal-track-name');
  const modalChairBox = document.getElementById('modal-chair-box');
  const modalChair = document.getElementById('modal-chair');
  const modalDescription = document.getElementById('modal-description');
  const modalAbstractLinkBox = document.getElementById('modal-abstract-link-box');
  const modalAbstractUrl = document.getElementById('modal-abstract-url');
  const modalBookmarkToggle = document.getElementById('modal-bookmark-toggle');
  const modalBookmarkText = document.getElementById('modal-bookmark-text');
  const modalIcsBtn = document.getElementById('modal-ics-btn');

  // Venue Map Modal Elements
  const mapModal = document.getElementById('map-modal');
  const btnOpenMap = document.getElementById('btn-open-map');
  const mapCloseBtn = document.getElementById('map-close-btn');

  const ALL_PARALLEL_ROOMS = [
    "Council Chamber (First Floor)",
    "Oxford Suite (Third Floor)",
    "Warren Suite (Third Floor)",
    "Euston Suite (First Floor)"
  ];

  const PARALLEL_ROOM_ORDER = {
    "Council Chamber (First Floor)": 1,
    "Oxford Suite (Third Floor)": 2,
    "Warren Suite (Third Floor)": 3,
    "Euston Suite (First Floor)": 4,
    "Council Chamber": 1,
    "Oxford Suite": 2,
    "Warren Suite": 3,
    "Euston Suite": 4
  };

  function getRoomOrderIndex(room) {
    if (!room) return 99;
    if (PARALLEL_ROOM_ORDER[room]) return PARALLEL_ROOM_ORDER[room];
    if (room.includes('Council')) return 1;
    if (room.includes('Oxford')) return 2;
    if (room.includes('Warren')) return 3;
    if (room.includes('Euston')) return 4;
    if (room.includes('Regent')) return 5;
    if (room.includes('Hallam') || room.includes('Cafe')) return 6;
    return 99;
  }

  function populateRoomFilterOptions() {
    if (!roomFilterSelect) return;
    const currentVal = state.selectedRoom || 'all';
    const roomSet = new Set();
    state.allSessions.forEach(s => {
      if (s.room && s.room.trim().length > 0) {
        roomSet.add(s.room.trim());
      }
    });

    const sortedRooms = Array.from(roomSet).sort((a, b) => {
      const orderA = getRoomOrderIndex(a);
      const orderB = getRoomOrderIndex(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    let optionsHtml = '<option value="all">All Rooms</option>';
    sortedRooms.forEach(room => {
      optionsHtml += `<option value="${escapeHtml(room)}">${escapeHtml(room)}</option>`;
    });

    roomFilterSelect.innerHTML = optionsHtml;
    roomFilterSelect.value = Array.from(roomSet).includes(currentVal) ? currentVal : 'all';
  }

  // 1. Synchronous / Async Schedule Loader
  async function loadScheduleData() {
    try {
      const response = await fetch('timetable.csv');
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const csvText = await response.text();
      state.allSessions = parseCSV(csvText);
    } catch (err) {
      console.warn('Fetch timetable.csv failed. Loading embedded dataset fallback...', err);
      if (typeof PRELOADED_SESSIONS !== 'undefined' && Array.isArray(PRELOADED_SESSIONS)) {
        state.allSessions = PRELOADED_SESSIONS;
      }
    }

    if (!state.allSessions || state.allSessions.length === 0) {
      if (typeof PRELOADED_SESSIONS !== 'undefined' && Array.isArray(PRELOADED_SESSIONS)) {
        state.allSessions = PRELOADED_SESSIONS;
      }
    }

    populateRoomFilterOptions();
    updateCounts();
    applyFilters();
  }

  // Robust CSV Parser supporting quotes & newlines
  function parseCSV(text) {
    if (!text) return [];
    const lines = [];
    let field = '';
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(field.trim());
        if (row.some(f => f.length > 0)) lines.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field.trim());
      lines.push(row);
    }

    if (lines.length === 0) return [];

    const headers = lines[0].map(h => h.replace(/^"|"$/g, '').trim());
    const records = [];

    for (let l = 1; l < lines.length; l++) {
      const currentLine = lines[l];
      if (currentLine.length === 0) continue;
      
      const obj = {};
      headers.forEach((h, idx) => {
        let val = currentLine[idx] || '';
        val = val.replace(/^"|"$/g, '').trim();
        obj[h] = val;
      });
      if (obj.id) records.push(obj);
    }
    return records;
  }

  // Helper to derive a unique session key from a track
  function getTrackKey(trackTitle, day, time) {
    return `${day}_${time}_${trackTitle}`.replace(/\s+/g, '_');
  }

  // 2. Count Badges
  function updateCounts() {
    const total = state.allSessions.length;
    const day1Count = state.allSessions.filter(s => s.day === 'Day 1').length;
    const day2Count = state.allSessions.filter(s => s.day === 'Day 2').length;

    const uniqueSpeakers = new Set();
    state.allSessions.forEach(s => {
      if (s.speaker && s.speaker.trim().length > 0) {
        uniqueSpeakers.add(s.speaker.trim());
      }
    });

    countAll.textContent = total;
    countDay1.textContent = day1Count;
    countDay2.textContent = day2Count;
    if (countSpeakers) countSpeakers.textContent = uniqueSpeakers.size;
    bookmarkBadgeCount.textContent = state.bookmarks.size;
  }

  // 3. Filter & Search Logic
  function applyFilters() {
    let filtered = [...state.allSessions];

    if (state.activeDay !== 'all' && state.activeDay !== 'speakers') {
      filtered = filtered.filter(s => s.day === state.activeDay);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.presentation_title && s.presentation_title.toLowerCase().includes(q)) ||
        (s.speaker && s.speaker.toLowerCase().includes(q)) ||
        (s.affiliation && s.affiliation.toLowerCase().includes(q)) ||
        (s.track_session && s.track_session.toLowerCase().includes(q)) ||
        (s.session_block && s.session_block.toLowerCase().includes(q)) ||
        (s.session_chair && s.session_chair.toLowerCase().includes(q)) ||
        (s.room && s.room.toLowerCase().includes(q))
      );
    }

    if (state.selectedRoom !== 'all') {
      filtered = filtered.filter(s => 
        s.room === state.selectedRoom || 
        (s.room && state.selectedRoom && (s.room.includes(state.selectedRoom) || state.selectedRoom.includes(s.room)))
      );
    }

    if (state.selectedType !== 'all') {
      filtered = filtered.filter(s => s.session_type === state.selectedType);
    }

    if (state.onlyBookmarks) {
      filtered = filtered.filter(s => {
        const key = getTrackKey(s.track_session || s.presentation_title, s.day, s.time_start);
        return state.bookmarks.has(key) || state.bookmarks.has(s.id);
      });
    }

    state.filteredSessions = filtered;
    renderSchedule();
  }

  // Poster session identification helpers
  function isPosterTalk(t) {
    if (!t) return false;
    const type = (t.session_type || '').toLowerCase();
    const track = (t.track_session || '').toLowerCase();
    const block = (t.session_block || '').toLowerCase();
    const title = (t.presentation_title || '').toLowerCase();
    return type.includes('poster') || track.includes('poster') || block.includes('poster') || title.includes('poster');
  }

  function isPosterTrack(track) {
    if (!track) return false;
    const type = (track.sessionType || '').toLowerCase();
    const title = (track.trackTitle || '').toLowerCase();
    const talksPoster = track.talks && track.talks.length > 0 && track.talks.some(isPosterTalk);
    return type.includes('poster') || title.includes('poster') || talksPoster;
  }

  // Determine if a track session should be expandable
  function isTrackExpandable(track) {
    if (track.isNotInUse) return false;

    const title = (track.trackTitle || '').toLowerCase();
    const type = (track.sessionType || '').toLowerCase();

    // Welcome, Instructions, Registration, Refreshments, Breaks, and Closing remarks are static non-expandable cards
    if (
      type === 'break' || 
      type === 'registration' ||
      title.includes('registration') ||
      title.includes('refreshment') ||
      title.includes('break') ||
      title.includes('lunch') ||
      title.includes('coffee') ||
      title.includes('close') ||
      title.includes('closing') ||
      title.includes('welcome') ||
      title.includes('instruction')
    ) {
      return false;
    }

    // Expandable if there are multiple talks or if it has distinct speakers/abstracts
    if (track.talks && track.talks.length > 1) return true;
    if (track.talks && track.talks.length === 1) {
      const talk = track.talks[0];
      if (talk.speaker || talk.abstract_url || (talk.notes_description && talk.notes_description.length > 50)) {
        return true;
      }
    }

    return false;
  }

  // 4. Render Schedule UI
  function renderSchedule() {
    if (state.activeDay === 'speakers') {
      renderSpeakersDirectory();
      return;
    }

    if (state.filteredSessions.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="empty-state">
          <i data-lucide="search-x" class="empty-icon"></i>
          <h3>No Sessions Found</h3>
          <p style="color:var(--text-muted); margin-top:0.5rem;">Try adjusting your search filters or day selection.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const timeBlocks = {};
    state.filteredSessions.forEach(session => {
      const blockKey = `${session.day} - ${session.time_start}`;
      if (!timeBlocks[blockKey]) {
        timeBlocks[blockKey] = {
          day: session.day,
          time: session.time_start,
          blockTitle: session.session_block,
          tracksMap: {}
        };
      }

      const trackKey = session.track_session || session.presentation_title;
      if (!timeBlocks[blockKey].tracksMap[trackKey]) {
        timeBlocks[blockKey].tracksMap[trackKey] = {
          trackTitle: trackKey,
          room: session.room,
          sessionType: session.session_type,
          sessionChair: session.session_chair || '',
          day: session.day,
          time: session.time_start,
          talks: []
        };
      }
      if (!timeBlocks[blockKey].tracksMap[trackKey].sessionChair && session.session_chair) {
        timeBlocks[blockKey].tracksMap[trackKey].sessionChair = session.session_chair;
      }
      timeBlocks[blockKey].tracksMap[trackKey].talks.push(session);
    });

    let html = '';
    let lastRenderedDay = null;

    Object.values(timeBlocks).forEach(block => {
      // Inject Day 2 Differentiator Banner when transitioning to Day 2 in "All Days" view
      if (state.activeDay === 'all' && block.day === 'Day 2' && lastRenderedDay === 'Day 1') {
        html += `
          <div class="day-divider-banner">
            <div class="day-divider-badge">
              <i data-lucide="calendar" style="width:14px; height:14px;"></i>
              <span>DAY 2 PROGRAMME</span>
            </div>
            <div class="day-divider-text">
              <span class="day-divider-title">Wednesday, 23 September 2026</span>
              <span class="day-divider-sub">• Day 2 Keynotes, Parallel Sessions & Closing Remarks</span>
            </div>
          </div>
        `;
      }
      lastRenderedDay = block.day;

      const isParallel = block.blockTitle && block.blockTitle.toLowerCase().includes('parallel');

      // Only show Council Chamber as not in use on Day 1, 15:25 (Do not show other rooms if they're not in use)
      const hasSearchQuery = state.searchQuery && state.searchQuery.trim().length > 0;
      if (isParallel && !state.onlyBookmarks && !hasSearchQuery) {
        if (block.day === 'Day 1' && block.time === '15:25') {
          const existingRooms = Array.from(new Set(Object.values(block.tracksMap).map(t => t.room)));
          const councilRoom = "Council Chamber (First Floor)";
          const isCouncilRepresented = existingRooms.some(r => r && r.includes('Council'));
          if (!isCouncilRepresented) {
            block.tracksMap[`unused_${councilRoom}`] = {
              trackTitle: "Room not in use",
              room: councilRoom,
              sessionType: "Parallel",
              day: block.day,
              time: block.time,
              isNotInUse: true,
              talks: []
            };
          }
        }
      }

      // Sort tracks by specified room order (Council Chamber, Oxford Suite, Warren Suite, Euston Suite)
      const sortedTracks = Object.values(block.tracksMap).sort((a, b) => {
        const orderA = getRoomOrderIndex(a.room);
        const orderB = getRoomOrderIndex(b.room);
        if (orderA !== orderB) return orderA - orderB;
        return (a.room || '').localeCompare(b.room || '');
      });

      html += `
        <div class="time-slot-row">
          <!-- Left Column: Timing Badge -->
          <div class="time-col">
            <div class="time-badge-box">
              <span class="time-display">${escapeHtml(block.time)}</span>
              <span class="time-day-label">${escapeHtml(block.day)}</span>
            </div>
          </div>

          <!-- Right Column: Sessions & Track Accordions -->
          <div class="sessions-col">
            ${isParallel ? `<h3 class="block-title-heading">${escapeHtml(block.blockTitle)}</h3>` : ''}
            <div class="session-groups-container">
              ${sortedTracks.map(track => createTrackAccordionHtml(track)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    scheduleContainer.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Attach click and keyboard listeners for expandable accordions (WCAG / WAI-ARIA Compliant)
    document.querySelectorAll('.session-group-header.clickable-header').forEach(header => {
      const toggleAccordion = () => {
        const card = header.closest('.session-group-card');
        if (card) {
          const isExpanded = card.classList.toggle('expanded');
          header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        }
      };

      header.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-btn')) return;
        toggleAccordion();
      });

      header.addEventListener('keydown', (e) => {
        if (e.target.closest('.bookmark-btn')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAccordion();
        }
      });
    });

    // Attach click listener for session-level bookmarking
    document.querySelectorAll('.session-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-track-key');
        toggleSessionBookmark(key);
      });
    });

    // Attach click listener for talk item modal details
    document.querySelectorAll('.talk-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-abstract') || e.target.closest('.btn-session-abstract')) return;
        const id = item.getAttribute('data-id');
        openSessionModal(id);
      });
    });
  }

  function createTrackAccordionHtml(track) {
    const roomClass = getRoomColorClass(track.room);
    const hasRoom = track.room && track.room.trim().length > 0;

    // Render "Room not in use" card without bookmark star button
    if (track.isNotInUse) {
      return `
        <div class="session-group-card static-card not-in-use-card">
          <div class="session-group-header static-header">
            <div class="session-group-title-box">
              <div class="session-group-meta-row">
                ${hasRoom ? `
                  <span class="room-tag">
                    <i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${escapeHtml(track.room)}
                  </span>
                ` : ''}
                <span class="session-type-badge" style="background:var(--bg-body); color:var(--text-light);">Not In Use</span>
              </div>
              <h3 class="session-group-title" style="color:var(--text-muted); font-weight:500; font-style:italic;">Room not in use during this session</h3>
            </div>
          </div>
        </div>
      `;
    }

    const expandable = isTrackExpandable(track);
    const shouldExpand = expandable && (state.expandAllState || (state.searchQuery && state.searchQuery.length > 0));
    
    const isPoster = isPosterTrack(track);
    const itemNoun = isPoster 
      ? (track.talks.length === 1 ? 'Poster' : 'Posters') 
      : (track.talks.length === 1 ? 'Talk' : 'Talks');

    const trackKey = getTrackKey(track.trackTitle, track.day, track.time);
    const isBookmarked = state.bookmarks.has(trackKey);

    const getAbstractUrl = (t) => (t && t.campaign_url && t.campaign_url.trim()) ? t.campaign_url.trim() : (t ? t.abstract_url : null);
    const sessionAbstractUrl = (track.talks && track.talks.find(t => getAbstractUrl(t))) ? getAbstractUrl(track.talks.find(t => getAbstractUrl(t))) : (getAbstractUrl(track) || null);

    return `
      <div class="session-group-card ${shouldExpand ? 'expanded' : ''} ${!expandable ? 'static-card' : ''}">
        <div class="session-group-header ${expandable ? 'clickable-header' : 'static-header'}" ${expandable ? `role="button" tabindex="0" aria-expanded="${shouldExpand ? 'true' : 'false'}" aria-label="Toggle ${isPoster ? 'posters' : 'presentations'} for ${escapeHtml(track.trackTitle)}"` : ''}>
          <div class="session-group-title-box">
            <div class="session-group-meta-row">
              ${hasRoom ? `
                <span class="room-tag">
                  <i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${escapeHtml(track.room)}
                </span>
              ` : ''}
              <span class="session-type-badge">${escapeHtml(track.sessionType)}</span>
              ${expandable ? `<span class="talk-count-badge">${track.talks.length} ${itemNoun}</span>` : ''}
            </div>
            <h3 class="session-group-title">${escapeHtml(track.trackTitle)}</h3>
            ${track.sessionChair ? `
              <div class="session-chair-badge" style="margin-top:0.35rem; font-size:0.825rem; color:var(--text-muted); font-weight:500;">
                <i data-lucide="user-check" style="width:14px; height:14px; vertical-align:middle; color:var(--clr-cls-cyan-dark); margin-right:0.25rem;"></i>
                <strong>Chair:</strong> ${escapeHtml(track.sessionChair)}
              </div>
            ` : ''}
            ${!expandable && track.talks && track.talks.length === 1 && track.talks[0].speaker ? `
              <div class="talk-speaker" style="margin-top:0.35rem; font-size:0.85rem;">
                <i data-lucide="user" style="width:14px; height:14px; vertical-align:middle; color:var(--clr-ucl-purple);"></i>
                <strong>${escapeHtml(track.talks[0].speaker)}</strong>
                ${track.talks[0].affiliation ? `<span>(${escapeHtml(track.talks[0].affiliation)})</span>` : ''}
              </div>
            ` : ''}
          </div>

          <div class="session-header-actions">
            <button class="bookmark-btn session-bookmark-btn ${isBookmarked ? 'active' : ''}" data-track-key="${escapeHtml(trackKey)}" title="${isBookmarked ? 'Remove session from My Schedule' : 'Add entire session to My Schedule'}" aria-label="${isBookmarked ? 'Remove session from My Schedule' : 'Add entire session to My Schedule'}">
              <i data-lucide="star" fill="${isBookmarked ? '#f59e0b' : 'none'}"></i>
            </button>
            ${expandable ? `
              <div class="expand-indicator" title="Click to Expand/Collapse ${isPoster ? 'Posters' : 'Talks'}">
                <i data-lucide="chevron-down" style="width:18px; height:18px;"></i>
              </div>
            ` : ''}
          </div>
        </div>

        ${expandable ? `
          <div class="session-group-content" role="region" aria-label="${escapeHtml(track.trackTitle)} ${isPoster ? 'posters' : 'presentations'}">
            <ul class="talk-list">
              ${track.talks.map(talk => createTalkItemHtml(talk)).join('')}
            </ul>
            ${sessionAbstractUrl ? `
              <div class="session-abstract-footer">
                <a href="${sessionAbstractUrl}" target="_blank" rel="noopener noreferrer" class="btn-session-abstract" onclick="event.stopPropagation();">
                  <i data-lucide="external-link" style="width:14px; height:14px;"></i> View session abstracts
                </a>
              </div>
            ` : ''}
          </div>
        ` : `
          ${sessionAbstractUrl ? `
            <div class="session-abstract-footer">
              <a href="${sessionAbstractUrl}" target="_blank" rel="noopener noreferrer" class="btn-session-abstract" onclick="event.stopPropagation();">
                <i data-lucide="external-link" style="width:14px; height:14px;"></i> View session abstracts
              </a>
            </div>
          ` : ''}
        `}
      </div>
    `;
  }

  // 4b. Render Speakers Directory (Alphabetical Index A-Z)
  function renderSpeakersDirectory() {
    const speakerMap = {};

    state.allSessions.forEach(session => {
      const name = (session.speaker || '').trim();
      if (!name) return;

      if (!speakerMap[name]) {
        speakerMap[name] = {
          name: name,
          affiliation: session.affiliation || 'University College London',
          talks: []
        };
      }
      if (session.affiliation && (!speakerMap[name].affiliation || speakerMap[name].affiliation === 'University College London')) {
        speakerMap[name].affiliation = session.affiliation;
      }
      speakerMap[name].talks.push(session);
    });

    let speakersList = Object.values(speakerMap);

    // Apply Search Filter if active
    if (state.searchQuery && state.searchQuery.trim().length > 0) {
      const q = state.searchQuery.toLowerCase();
      speakersList = speakersList.filter(sp => 
        sp.name.toLowerCase().includes(q) ||
        sp.affiliation.toLowerCase().includes(q) ||
        sp.talks.some(t => 
          (t.presentation_title && t.presentation_title.toLowerCase().includes(q)) ||
          (t.track_session && t.track_session.toLowerCase().includes(q)) ||
          (t.session_chair && t.session_chair.toLowerCase().includes(q))
        )
      );
    }

    if (speakersList.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="empty-state">
          <i data-lucide="users" class="empty-icon"></i>
          <h3>No Speakers Found</h3>
          <p style="color:var(--text-muted); margin-top:0.5rem;">Try adjusting your search query.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Sort Alphabetically by Surname
    speakersList.sort((a, b) => {
      const getSortKey = name => {
        const parts = name.split(/\s+/);
        return parts[parts.length - 1] + ' ' + parts[0];
      };
      return getSortKey(a.name).localeCompare(getSortKey(b.name));
    });

    // Group by first letter of surname
    const grouped = {};
    speakersList.forEach(sp => {
      const parts = sp.name.split(/\s+/);
      const surname = parts[parts.length - 1] || sp.name;
      const firstChar = (surname[0] || 'A').toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(sp);
    });

    const activeLetters = Object.keys(grouped).sort();

    let html = '<div class="speakers-directory-wrapper">';
    
    // Jump Navigation Bar
    html += '<div class="alpha-jump-bar">';
    activeLetters.forEach(letter => {
      html += `<a href="#speaker-group-${letter}" class="alpha-jump-btn" onclick="event.preventDefault(); document.getElementById('speaker-group-${letter}').scrollIntoView({behavior:'smooth'});">${letter}</a>`;
    });
    html += '</div>';

    function getSpeakerTalkLabel(talks) {
      const posterCount = talks.filter(isPosterTalk).length;
      const total = talks.length;

      if (posterCount === total) {
        return total === 1 ? 'Poster' : 'Posters';
      } else if (posterCount > 0) {
        return 'Presentations & Posters';
      } else {
        return total === 1 ? 'Presentation' : 'Presentations';
      }
    }

    // Speaker Cards Grid by Letter
    activeLetters.forEach(letter => {
      html += `
        <div id="speaker-group-${letter}">
          <h2 class="speakers-group-header">
            <i data-lucide="user" style="width:20px; height:20px;"></i>
            ${letter}
          </h2>
          <div class="speakers-grid">
            ${grouped[letter].map(sp => `
              <div class="speaker-card">
                <div class="speaker-card-header">
                  <div class="speaker-avatar-lg">${getInitials(sp.name)}</div>
                  <div class="speaker-card-info">
                    <h3 class="speaker-name-title">${escapeHtml(sp.name)}</h3>
                    <span class="speaker-aff-text">${escapeHtml(sp.affiliation)}</span>
                  </div>
                </div>
                <div class="speaker-talks-list">
                  <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">
                    ${sp.talks.length} ${getSpeakerTalkLabel(sp.talks)}
                  </span>
                  ${sp.talks.map(t => {
                    const isPoster = isPosterTalk(t);
                    return `
                      <div class="speaker-talk-card talk-item" data-id="${t.id}">
                        <div class="speaker-talk-meta">
                          ${t.room && t.room.trim() ? `
                            <span class="room-tag" style="font-size:0.7rem; padding:0.15rem 0.5rem;">
                              <i data-lucide="map-pin" style="width:10px; height:10px;"></i> ${escapeHtml(t.room)}
                            </span>
                          ` : ''}
                          ${isPoster ? `
                            <span class="session-type-badge" style="background:#f4eaef; color:var(--clr-cls-cyan-dark); border-color:rgba(123,44,191,0.2); font-size:0.68rem; padding:0.1rem 0.45rem;">
                              Poster
                            </span>
                          ` : ''}
                          <span style="font-weight:600; color:var(--clr-ucl-purple);">${escapeHtml(t.day)} (${escapeHtml(t.time_start)})</span>
                        </div>
                        <h4 class="speaker-talk-title">${escapeHtml(t.presentation_title)}</h4>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';

    scheduleContainer.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Attach click listener for speaker talk cards to open modal
    document.querySelectorAll('.speaker-talk-card').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        openSessionModal(id);
      });
    });
  }

  function createTalkItemHtml(session) {
    return `
      <li class="talk-item" data-id="${session.id}">
        <div class="talk-main">
          <h4 class="talk-title">${escapeHtml(session.presentation_title)}</h4>
          ${session.speaker ? `
            <div class="talk-speaker">
              <i data-lucide="user" style="width:14px; height:14px; vertical-align:middle; color:var(--clr-ucl-purple);"></i>
              <strong>${escapeHtml(session.speaker)}</strong>
              ${session.affiliation ? `<span>(${escapeHtml(session.affiliation)})</span>` : ''}
            </div>
          ` : ''}
        </div>
      </li>
    `;
  }

  function getRoomColorClass(room) {
    return '';
  }

  function getInitials(name) {
    if (!name) return 'CLS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // 5. Entire Session Bookmarking Toggle
  function toggleSessionBookmark(trackKey) {
    if (state.bookmarks.has(trackKey)) {
      state.bookmarks.delete(trackKey);
    } else {
      state.bookmarks.add(trackKey);
    }
    localStorage.setItem('cls_bookmarks', JSON.stringify([...state.bookmarks]));
    updateCounts();

    if (state.onlyBookmarks) {
      applyFilters();
    } else {
      renderSchedule();
    }

    if (state.activeSession) {
      const activeKey = getTrackKey(state.activeSession.track_session || state.activeSession.presentation_title, state.activeSession.day, state.activeSession.time_start);
      if (activeKey === trackKey) updateModalBookmarkButton();
    }
  }

  // 6. Modal Functions
  function openSessionModal(id) {
    const session = state.allSessions.find(s => s.id === id);
    if (!session) return;
    state.activeSession = session;

    if (session.room && session.room.trim()) {
      modalRoomTag.style.display = 'inline-flex';
      modalRoomTag.innerHTML = `<i data-lucide="map-pin" style="width:12px; height:12px; margin-right:0.3rem;"></i> ${escapeHtml(session.room)}`;
    } else {
      modalRoomTag.style.display = 'none';
    }
    modalTitle.textContent = session.presentation_title;
    modalDay.textContent = `${session.day} (${session.date})`;
    modalTime.textContent = session.time_start;
    modalType.textContent = session.session_type;

    if (session.speaker) {
      modalSpeakerBox.style.display = 'flex';
      modalSpeakerAvatar.textContent = getInitials(session.speaker);
      modalSpeakerName.textContent = session.speaker;
      modalSpeakerAff.textContent = session.affiliation || 'University College London';
    } else {
      modalSpeakerBox.style.display = 'none';
    }

    modalTrackName.textContent = session.track_session || session.session_block;
    if (session.session_chair && modalChairBox && modalChair) {
      modalChairBox.style.display = 'block';
      modalChair.textContent = session.session_chair;
    } else if (modalChairBox) {
      modalChairBox.style.display = 'none';
    }
    modalDescription.textContent = session.notes_description || 'No additional abstract notes provided for this session.';

    const abstractLink = (session.campaign_url && session.campaign_url.trim()) ? session.campaign_url.trim() : session.abstract_url;
    if (abstractLink) {
      modalAbstractLinkBox.style.display = 'block';
      modalAbstractUrl.href = abstractLink;
    } else {
      modalAbstractLinkBox.style.display = 'none';
    }

    updateModalBookmarkButton();

    sessionModal.classList.add('active');
    sessionModal.setAttribute('aria-hidden', 'false');
    if (window.lucide) lucide.createIcons();
  }

  function closeModal() {
    sessionModal.classList.remove('active');
    sessionModal.setAttribute('aria-hidden', 'true');
    state.activeSession = null;
  }

  function updateModalBookmarkButton() {
    if (!state.activeSession) return;
    const trackKey = getTrackKey(state.activeSession.track_session || state.activeSession.presentation_title, state.activeSession.day, state.activeSession.time_start);
    const isBookmarked = state.bookmarks.has(trackKey);

    if (isBookmarked) {
      modalBookmarkText.textContent = 'Remove Session from My Schedule';
      modalBookmarkToggle.style.background = '#fef3c7';
      modalBookmarkToggle.style.color = '#b45309';
      modalBookmarkToggle.style.borderColor = '#f59e0b';
    } else {
      modalBookmarkText.textContent = 'Add Entire Session to My Schedule';
      modalBookmarkToggle.style.background = 'var(--bg-body)';
      modalBookmarkToggle.style.color = 'var(--text-main)';
      modalBookmarkToggle.style.borderColor = 'var(--border-color)';
    }
  }

  // Generate .ics iCalendar file for session
  function generateIcsFile(session) {
    const startDateStr = session.day === 'Day 2' ? '20260923' : '20260922';
    const [hrs, mins] = session.time_start.split(':');
    const startIso = `${startDateStr}T${hrs}${mins}00Z`;
    
    const endHrs = String(Number(hrs) + (Number(mins) + 45 >= 60 ? 1 : 0)).padStart(2, '0');
    const endMins = String((Number(mins) + 45) % 60).padStart(2, '0');
    const endIso = `${startDateStr}T${endHrs}${endMins}00Z`;

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CLS Conference 2026//EN',
      'BEGIN:VEVENT',
      `UID:${session.id}-2026@cls.ucl.ac.uk`,
      `DTSTAMP:${startIso}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:${session.presentation_title}`,
      `LOCATION:Cavendish Venues - 44 Hallam Street\\, London W1W 6JJ`,
      `DESCRIPTION:Speaker: ${session.speaker || 'N/A'}\\nTrack: ${session.track_session}\\nAbstract: ${session.abstract_url || 'N/A'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `CLS2026_${session.id}.ics`;
    link.click();
  }

  // 7. Event Listener Attachments
  const searchClearBtn = document.getElementById('search-clear-btn');
  const btnBackToTop = document.getElementById('btn-back-to-top');

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (searchClearBtn) {
      searchClearBtn.style.display = state.searchQuery.trim().length > 0 ? 'flex' : 'none';
    }
    applyFilters();
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClearBtn.style.display = 'none';
      applyFilters();
      searchInput.focus();
    });
  }

  if (btnBackToTop) {
    btnBackToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  dayTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dayTabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.activeDay = btn.getAttribute('data-day');
      state.onlyBookmarks = false;
      btnBookmarks.classList.remove('active');
      applyFilters();
    });
  });

  roomFilterSelect.addEventListener('change', (e) => {
    state.selectedRoom = e.target.value;
    applyFilters();
  });

  typePillBtns.forEach(pill => {
    pill.addEventListener('click', () => {
      typePillBtns.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedType = pill.getAttribute('data-type');
      applyFilters();
    });
  });

  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      state.expandAllState = !state.expandAllState;
      expandAllBtn.classList.toggle('active', state.expandAllState);
      const span = expandAllBtn.querySelector('span');
      if (span) span.textContent = state.expandAllState ? 'Collapse All' : 'Expand All';
      renderSchedule();
    });
  }

  btnBookmarks.addEventListener('click', () => {
    state.onlyBookmarks = !state.onlyBookmarks;
    btnBookmarks.classList.toggle('active', state.onlyBookmarks);
    applyFilters();
  });

  modalCloseBtn.addEventListener('click', closeModal);
  sessionModal.addEventListener('click', (e) => {
    if (e.target === sessionModal) closeModal();
  });

  modalBookmarkToggle.addEventListener('click', () => {
    if (state.activeSession) {
      const trackKey = getTrackKey(state.activeSession.track_session || state.activeSession.presentation_title, state.activeSession.day, state.activeSession.time_start);
      toggleSessionBookmark(trackKey);
    }
  });

  modalIcsBtn.addEventListener('click', () => {
    if (state.activeSession) generateIcsFile(state.activeSession);
  });

  btnOpenMap.addEventListener('click', () => {
    mapModal.classList.add('active');
    mapModal.setAttribute('aria-hidden', 'false');
  });

  mapCloseBtn.addEventListener('click', () => {
    mapModal.classList.remove('active');
    mapModal.setAttribute('aria-hidden', 'true');
  });

  mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) {
      mapModal.classList.remove('active');
      mapModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Accessibility: Keyboard Escape listener to close active modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (sessionModal && sessionModal.classList.contains('active')) {
        closeModal();
      }
      if (mapModal && mapModal.classList.contains('active')) {
        mapModal.classList.remove('active');
        mapModal.setAttribute('aria-hidden', 'true');
      }
    }
  });


  // Initialize
  loadScheduleData();
});

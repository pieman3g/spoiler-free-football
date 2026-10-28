const container = document.getElementById('matches-container');
const subtitleEl = document.querySelector('.section-subtitle');
const titleEl = document.querySelector('.section-title');
const dateSelect = document.getElementById('date-select');
const leagueSelect = document.getElementById('league-select');
const prevBtn = document.getElementById('prev-date-btn');
const nextBtn = document.getElementById('next-date-btn');

// Load saved preferences from localStorage or fall back to defaults
let currentLeague = localStorage.getItem('quiet_pitch_league') || 'eng.1';
let savedDateIndex = localStorage.getItem('quiet_pitch_date_index');
let currentMatchDateIndex = savedDateIndex !== null ? parseInt(savedDateIndex) : -1;
let globalSpoilersRevealed = false;

// Set the dropdown to match the saved league on load and update title
if (leagueSelect) {
  leagueSelect.value = currentLeague;
  const selectedOpt = leagueSelect.options[leagueSelect.selectedIndex];
  if (selectedOpt && titleEl) {
    titleEl.textContent = selectedOpt.text;
  }
}

function formatDateForParam(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function parseParamDate(dateStr) {
  const y = parseInt(dateStr.substring(0, 4));
  const m = parseInt(dateStr.substring(4, 6)) - 1;
  const d = parseInt(dateStr.substring(6, 8));
  return new Date(y, m, d);
}

async function initCalendar() {
  try {
    if (currentLeague.toLowerCase().includes('uefa') || currentLeague === 'eng.fa') {
      matchDates = [];
      const today = new Date();
      
      for (let i = -14; i <= 45; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
          matchDates.push(formatDateForParam(d));
        }
      }

      setupInitialDateIndex();
      return;
    }

    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${currentLeague}/scoreboard`);
    const data = await res.json();
    
    const calendarEntries = data.leagues?.[0]?.calendar || [];
    
    matchDates = calendarEntries.map(entry => {
      if (typeof entry === 'string') {
        return entry.substring(0, 10).replace(/-/g, '');
      } else if (entry.startDate) {
        return entry.startDate.substring(0, 10).replace(/-/g, '');
      }
      return null;
    }).filter(Boolean);

    matchDates = [...new Set(matchDates)].sort();

    if (matchDates.length === 0) {
      matchDates = [formatDateForParam(new Date())];
    }

    setupInitialDateIndex();
  } catch (err) {
    console.error("Error initializing calendar:", err);
    matchDates = [formatDateForParam(new Date())];
    setupInitialDateIndex();
  }
}

function setupInitialDateIndex() {
  const todayStr = formatDateForParam(new Date());
  
  if (matchDates.length > 0) {
    if (currentMatchDateIndex === -1 || currentMatchDateIndex >= matchDates.length) {
      currentMatchDateIndex = matchDates.findIndex(d => d >= todayStr);
      if (currentMatchDateIndex === -1) {
        currentMatchDateIndex = matchDates.length - 1;
      }
    }
  } else {
    matchDates = [todayStr];
    currentMatchDateIndex = 0;
  }
  
  populateDropdown();
  loadMatchesForCurrentIndex();
}

function populateDropdown() {
  dateSelect.innerHTML = '';
  const todayStr = formatDateForParam(new Date());

  matchDates.forEach((dateStr, idx) => {
    const d = parseParamDate(dateStr);
    const option = document.createElement('option');
    option.value = idx;

    const formattedLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    option.textContent = (dateStr === todayStr) ? `Today (${formattedLabel})` : formattedLabel;

    dateSelect.appendChild(option);
  });
}

function updateNavButtons() {
  prevBtn.disabled = currentMatchDateIndex <= 0;
  nextBtn.disabled = currentMatchDateIndex >= matchDates.length - 1;
  prevBtn.style.opacity = prevBtn.disabled ? "0.4" : "1";
  nextBtn.style.opacity = nextBtn.disabled ? "0.4" : "1";
}

async function loadMatchesForCurrentIndex() {
  if (currentMatchDateIndex < 0 || currentMatchDateIndex >= matchDates.length) return;
  
  const dateStr = matchDates[currentMatchDateIndex];
  dateSelect.value = currentMatchDateIndex;
  updateNavButtons();

  const dateObj = parseParamDate(dateStr);

  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${currentLeague}/scoreboard?dates=${dateStr}`);
    if (!response.ok) throw new Error("Failed to fetch live data");
    
    const data = await response.json();
    const events = data.events || [];
    
    const formattedHeaderDate = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">No matches scheduled for this date.</p>';
      if (subtitleEl) subtitleEl.textContent = `0 matches on ${formattedHeaderDate}`;
      return;
    }

    if (subtitleEl) {
      subtitleEl.textContent = `${events.length} match${events.length === 1 ? '' : 'es'} on ${formattedHeaderDate}`;
    }

    const matches = events.map(event => {
      const matchId = event.id;
      const statusType = event.status.type;
      const state = statusType.state; 
      
      const matchDateObj = new Date(event.date);
      const dayStr = matchDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = matchDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateTimeDisplay = `${dayStr} · ${timeStr}`;

      const competitions = event.competitions[0];
      const competitors = competitions.competitors;
      
      let homeName = "Home", awayName = "Away";
      let homeScore = "0", awayScore = "0";
      let homeLogo = "", awayLogo = "";
      
      const homeComp = competitors.find(c => c.homeAway === "home");
      const awayComp = competitors.find(c => c.homeAway === "away");

      if (homeComp) {
        homeName = homeComp.team.shortDisplayName || homeComp.team.name;
        homeScore = homeComp.score || "0";
        homeLogo = homeComp.team.logo || "";
      }
      if (awayComp) {
        awayName = awayComp.team.shortDisplayName || awayComp.team.name;
        awayScore = awayComp.score || "0";
        awayLogo = awayComp.team.logo || "";
      }
      
      const matchName = `${homeName} vs ${awayName}`;
      
      let scoreStr = "vs";
      let statusText = "UPCOMING";
      
      if (state === "in") {
        scoreStr = `${homeScore} - ${awayScore}`;
        statusText = `LIVE ${event.status.type.detail || ''}`;
      } else if (state === "post") {
        scoreStr = `${homeScore} - ${awayScore}`;
        statusText = "FULL TIME";
      } else {
        statusText = "SCHEDULED";
      }

      const isFinished = (state === "post");

      return {
        id: matchId,
        teams: matchName,
        homeTeam: homeName,
        awayTeam: awayName,
        homeLogo: homeLogo,
        awayLogo: awayLogo,
        score: scoreStr,
        status: statusText,
        dateTime: dateTimeDisplay,
        highlightUrl: isFinished ? `https://www.youtube.com/results?search_query=${encodeURIComponent(matchName + ' highlights')}` : '',
        upvotes: 0,
        downvotes: 0
      };
    });
    
    renderMatches(matches);
  } catch (error) {
    console.error("Error loading live matches:", error);
    loadFallbackMatches();
  }
}

async function loadFallbackMatches() {
  try {
    const response = await fetch('matches.json?t=' + new Date().getTime());
    const matches = await response.json();
    if (subtitleEl) subtitleEl.textContent = `${matches.length} matches found`;
    renderMatches(matches);
  } catch (err) {
    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Unable to load matches.</p>';
  }
}

function renderMatches(matches) {
  container.innerHTML = '';
  const savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};

  matches.forEach(match => {
    const userVote = savedVotes[match.id] || 0;

    const card = document.createElement('div');
    card.classList.add('match-card');

    card.innerHTML = `
      <div class="card-top">
        <span class="status">${match.status}</span>
        <span>${match.dateTime}</span>
      </div>
      <div class="teams-container">
        <div class="team-side home ${globalSpoilersRevealed ? 'score-visible' : ''}">
          ${match.homeLogo ? `<img src="${match.homeLogo}" alt="" class="team-badge">` : ''}
          <div class="team-info-block">
            <span class="team-name">${match.homeTeam}</span>
            <div class="scorers ${globalSpoilersRevealed ? '' : 'hidden'}" id="home-scorers-${match.id}"></div>
          </div>
        </div>
        <div class="center-area">
          <span class="vs-divider ${globalSpoilersRevealed ? 'hidden' : ''}" id="vs-${match.id}">vs</span>
          <span class="score ${globalSpoilersRevealed ? '' : 'hidden'}" id="score-${match.id}">${match.score}</span>
        </div>
        <div class="team-side away ${globalSpoilersRevealed ? 'score-visible' : ''}">
          <div class="team-info-block">
            <span class="team-name">${match.awayTeam}</span>
            <div class="scorers ${globalSpoilersRevealed ? '' : 'hidden'}" id="away-scorers-${match.id}"></div>
          </div>
          ${match.awayLogo ? `<img src="${match.awayLogo}" alt="" class="team-badge">` : ''}
        </div>
      </div>
      <div class="card-footer">
        <div>
          ${match.highlightUrl && match.highlightUrl !== '#' 
            ? `<a href="${match.highlightUrl}" target="_blank" rel="noopener noreferrer" class="highlight-btn">▶ Highlights</a>` 
            : '<span style="color:#6b7280; font-size:0.8rem;">No Video</span>'}
        </div>
        <div class="card-actions">
          <button class="reveal-btn" onclick="toggleScore(event, ${match.id})">${globalSpoilersRevealed ? 'Hide score' : 'Show score'}</button>
          <button class="vote-btn ${userVote === 1 ? 'active' : ''}" onclick="vote(${match.id})">★ Save</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function toggleScore(event, matchId) {
  const scoreSpan = document.getElementById(`score-${matchId}`);
  const vsSpan = document.getElementById(`vs-${matchId}`);
  const homeScorers = document.getElementById(`home-scorers-${matchId}`);
  const awayScorers = document.getElementById(`away-scorers-${matchId}`);
  const card = event.target.closest('.match-card');
  const teamSides = card.querySelectorAll('.team-side');
  const btn = event.target;
  
  const isHidden = scoreSpan.classList.contains('hidden');

  scoreSpan.classList.toggle('hidden');
  vsSpan.classList.toggle('hidden');
  if (homeScorers) homeScorers.classList.toggle('hidden');
  if (awayScorers) awayScorers.classList.toggle('hidden');
  
  // Toggle truncation class dynamically when score is shown/hidden
  teamSides.forEach(side => side.classList.toggle('score-visible', isHidden));
  
  btn.textContent = isHidden ? 'Hide score' : 'Show score';
}

function vote(matchId) {
  let savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};
  savedVotes[matchId] = savedVotes[matchId] === 1 ? 0 : 1;
  localStorage.setItem('spoiler_free_votes', JSON.stringify(savedVotes));
  loadMatchesForCurrentIndex();
}

// Global Spoiler Modal & Toggle Handlers
function handleGlobalSpoilerClick() {
  if (globalSpoilersRevealed) {
    globalSpoilersRevealed = false;
    document.getElementById('spoiler-state-text').textContent = 'hidden';
    document.getElementById('global-spoiler-toggle').classList.remove('active');
    updateAllScoresVisibility(false);
  } else {
    const dontAsk = localStorage.getItem('spoiler_dont_ask') === 'true';
    if (dontAsk) {
      revealAllScores();
    } else {
      document.getElementById('spoiler-modal').classList.remove('hidden');
    }
  }
}

function closeSpoilerModal() {
  document.getElementById('spoiler-modal').classList.add('hidden');
}

function confirmRevealAll() {
  const dontAskChecked = document.getElementById('dont-ask-checkbox').checked;
  if (dontAskChecked) {
    localStorage.setItem('spoiler_dont_ask', 'true');
  }
  closeSpoilerModal();
  revealAllScores();
}

function revealAllScores() {
  globalSpoilersRevealed = true;
  document.getElementById('spoiler-state-text').textContent = 'shown';
  document.getElementById('global-spoiler-toggle').classList.add('active');
  updateAllScoresVisibility(true);
}

function updateAllScoresVisibility(show) {
  const scoreSpans = document.querySelectorAll('.score');
  const vsSpans = document.querySelectorAll('.vs-divider');
  const scorersBlocks = document.querySelectorAll('.scorers');
  const revealBtns = document.querySelectorAll('.reveal-btn');
  const teamSides = document.querySelectorAll('.team-side');

  scoreSpans.forEach(el => {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  vsSpans.forEach(el => {
    if (show) el.classList.add('hidden');
    else el.classList.remove('hidden');
  });

  scorersBlocks.forEach(el => {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  teamSides.forEach(side => {
    if (show) side.classList.add('score-visible');
    else side.classList.remove('score-visible');
  });

  revealBtns.forEach(btn => {
    btn.textContent = show ? 'Hide score' : 'Show score';
  });
}

// Event Listeners with localStorage persistence
if (leagueSelect) {
  leagueSelect.addEventListener('change', (e) => {
    currentLeague = e.target.value;
    localStorage.setItem('quiet_pitch_league', currentLeague);
    
    localStorage.removeItem('quiet_pitch_date_index');
    currentMatchDateIndex = -1;

    const selectedText = e.target.options[e.target.selectedIndex].text;
    if (titleEl) titleEl.textContent = selectedText;
    initCalendar();
  });
}

dateSelect.addEventListener('change', (e) => {
  currentMatchDateIndex = parseInt(e.target.value);
  localStorage.setItem('quiet_pitch_date_index', currentMatchDateIndex);
  loadMatchesForCurrentIndex();
});

prevBtn.addEventListener('click', () => {
  if (currentMatchDateIndex > 0) {
    currentMatchDateIndex--;
    localStorage.setItem('quiet_pitch_date_index', currentMatchDateIndex);
    loadMatchesForCurrentIndex();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentMatchDateIndex < matchDates.length - 1) {
    currentMatchDateIndex++;
    localStorage.setItem('quiet_pitch_date_index', currentMatchDateIndex);
    loadMatchesForCurrentIndex();
  }
});

initCalendar();

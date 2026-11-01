const container = document.getElementById('matches-container');
const subtitleEl = document.querySelector('.section-subtitle');
const titleEl = document.querySelector('.section-title');
const dateSelect = document.getElementById('date-select');
const leagueSelect = document.getElementById('league-select');
const prevBtn = document.getElementById('prev-date-btn');
const nextBtn = document.getElementById('next-date-btn');

let currentLeague = localStorage.getItem('quiet_pitch_league') || 'eng.1';
// The last date viewed is remembered by its value (YYYYMMDD), not its position in the list,
// because the list of dates can change from one visit to the next.
let savedDate = localStorage.getItem('quiet_pitch_date');
let currentMatchDateIndex = -1;
let globalSpoilersRevealed = false;
let matchDates = [];
let currentTab = 'matches';

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

function switchTab(tabName) {
  currentTab = tabName;
  
  document.getElementById('tab-matches').classList.toggle('active', tabName === 'matches');
  document.getElementById('tab-saved').classList.toggle('active', tabName === 'saved');
  document.getElementById('tab-watchability').classList.toggle('active', tabName === 'watchability');

  const datePickerBar = document.querySelector('.date-picker-bar');
  const competitionBar = document.querySelector('.competition-selector-bar');
  
  if (tabName === 'saved') {
    if (datePickerBar) datePickerBar.style.display = 'none';
    if (competitionBar) competitionBar.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Saved Matches';
    if (subtitleEl) subtitleEl.textContent = 'Your bookmarked matches archive';
    loadSavedMatches();
  } else if (tabName === 'matches') {
    if (datePickerBar) datePickerBar.style.display = 'flex';
    if (competitionBar) competitionBar.style.display = 'flex';
    const selectedOpt = leagueSelect.options[leagueSelect.selectedIndex];
    if (selectedOpt && titleEl) titleEl.textContent = selectedOpt.text;
    loadMatchesForCurrentIndex();
  } else {
    if (datePickerBar) datePickerBar.style.display = 'none';
    if (competitionBar) competitionBar.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Watchability Feed';
    if (subtitleEl) subtitleEl.textContent = 'Coming soon...';
    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Watchability curation view is under construction.</p>';
  }
}

async function loadSavedMatches() {
  container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Loading saved matches...</p>';
  
  const savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};
  const savedMatchIds = Object.keys(savedVotes).filter(id => savedVotes[id] === 1);

  if (savedMatchIds.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">No saved matches yet. Click the "★ Save" button on any match card to archive it here!</p>';
    return;
  }

  try {
    const matchPromises = savedMatchIds.map(async (matchId) => {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchId}`);
      if (!res.ok) return null;
      const data = await res.json();
      const competition = data.header?.competitions?.[0];
      if (!competition) return null;

      const competitors = competition.competitors || [];
      const homeComp = competitors.find(c => c.homeAway === "home");
      const awayComp = competitors.find(c => c.homeAway === "away");

      let homeName = homeComp?.team?.shortDisplayName || homeComp?.team?.name || homeComp?.team?.displayName || "Home";
      let awayName = awayComp?.team?.shortDisplayName || awayComp?.team?.name || awayComp?.team?.displayName || "Away";
      let homeScore = parseInt(homeComp?.score || "0", 10);
      let awayScore = parseInt(awayComp?.score || "0", 10);
      let homeLogo = homeComp?.team?.logo || "";
      let awayLogo = awayComp?.team?.logo || "";

      let homeScorersList = "";
      let awayScorersList = "";
      if (data.details && Array.isArray(data.details)) {
        const homeTeamId = homeComp?.team?.id;
        const homeScorers = [];
        const awayScorers = [];

        data.details.forEach(detail => {
          if (detail.scoringPlay && detail.athletesInvolved && detail.athletesInvolved.length > 0) {
            const scorerName = detail.athletesInvolved[0].shortName || detail.athletesInvolved[0].displayName;
            const minute = detail.clock?.displayValue || '';
            const scorerText = `${scorerName} ${minute}'`;

            if (detail.team?.id === homeTeamId) {
              homeScorers.push(scorerText);
            } else {
              awayScorers.push(scorerText);
            }
          }
        });
        homeScorersList = homeScorers.join('<br>');
        awayScorersList = awayScorers.join('<br>');
      }

      const matchDateObj = new Date(competition.date || data.header?.competitions?.[0]?.date);
      const dayStr = matchDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = matchDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateTimeDisplay = `${dayStr} · ${timeStr}`;

      const statusState = competition.status?.type?.state;
      const isLiveMatch = (statusState === "in");
      let statusText = '';

      if (isLiveMatch) {
        const detailText = competition.status?.type?.detail || 'LIVE';
        statusText = `<span class="pulsing-dot"></span>${detailText}`;
      } else {
        statusText = statusState === "post" ? "FULL TIME" : "SCHEDULED";
      }

      const isFinished = (statusState === "post" || statusState === "in");
      const totalGoals = homeScore + awayScore;
      const isDraw = homeScore === awayScore;
      const btts = (homeScore > 0 && awayScore > 0);
      const matchName = `${homeName} vs ${awayName}`;

      return {
        id: matchId,
        teams: matchName,
        homeTeam: homeName,
        awayTeam: awayName,
        homeLogo: homeLogo,
        awayLogo: awayLogo,
        homeScorers: homeScorersList,
        awayScorers: awayScorersList,
        score: `${homeScore} - ${awayScore}`,
        status: statusText,
        isLive: isLiveMatch,
        dateTime: dateTimeDisplay,
        hasGoalsText: isFinished ? (totalGoals > 0 ? 'Yes.' : 'No (0-0 draw / scoreless).') : 'Match not started yet.',
        howManyGoalsText: isFinished ? (totalGoals > 0 ? `${totalGoals} total goal${totalGoals === 1 ? '' : 's'} scored.` : '0 goals.') : 'N/A',
        isDrawText: isFinished ? (isDraw ? 'Yes, the match ended in a draw.' : 'No, there was a decisive winner.') : 'Match not started yet.',
        bttsText: isFinished ? (btts ? 'Yes, both teams scored.' : 'No (at least one team kept a clean sheet).') : 'Match not started yet.',
        highlightUrl: isFinished && statusState === "post" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(matchName + ' highlights')}` : '',
      };
    });

    const resolvedMatches = (await Promise.all(matchPromises)).filter(Boolean);

    if (resolvedMatches.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Could not retrieve saved matches from the server.</p>';
      return;
    }

    renderMatches(resolvedMatches);
  } catch (err) {
    console.error("Error loading saved matches:", err);
    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Could not load saved matches.</p>';
  }
}

// ---------------------------------------------------------------------------
// Which days appear in the date dropdown.
//
// We only want days that actually have games. ESPN's league "calendar" gives us
// that for some leagues (like the Premier League), but for others (the European
// competitions) it is missing, made of rounds rather than days, or lists nearly
// every day. So:
//   1. If the calendar is a believable list of match days, use it.
//   2. Otherwise ask ESPN for every fixture in a window around today (one request)
//      and keep only the days that have a game. Cached for the rest of the day.
//   3. If that fails too, fall back to listing every day (the old behaviour).
// ---------------------------------------------------------------------------
const FIXTURE_WINDOW_DAYS_BACK = 45;
const FIXTURE_WINDOW_DAYS_AHEAD = 60;

function scoreboardUrl(league) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;
}

function toParamDate(isoText) {
  // "2026-11-04T20:00Z" -> "20261104"
  const d = String(isoText || '').substring(0, 10).replace(/-/g, '');
  return /^\d{8}$/.test(d) ? d : null;
}

function daysBetween(firstParam, lastParam) {
  return Math.round((parseParamDate(lastParam) - parseParamDate(firstParam)) / 86400000);
}

function fallbackDates() {
  const dates = [];
  const today = new Date();
  for (let i = -30; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(formatDateForParam(d));
  }
  return dates;
}

// Returns a list of match days, or null if the calendar can't be trusted.
function datesFromCalendar(data) {
  const entries = data && data.leagues && data.leagues[0] && data.leagues[0].calendar;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  if (!entries.every(e => typeof e === 'string')) return null;   // rounds/stages, not days

  const dates = [...new Set(entries.map(toParamDate).filter(Boolean))].sort();
  if (dates.length < 5) return null;

  // A calendar that lists nearly every day isn't telling us which days have games.
  const spanDays = daysBetween(dates[0], dates[dates.length - 1]) + 1;
  if (dates.length / spanDays > 0.7) return null;
  return dates;
}

// Returns the days (YYYYMMDD) that have at least one fixture near today. Throws on network errors.
async function datesFromFixtures(league) {
  const today = new Date();
  const todayKey = formatDateForParam(today);
  const cacheKey = `quiet_pitch_dates_${league}`;

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && cached.day === todayKey && Array.isArray(cached.dates) && cached.dates.length >= 2) {
      return cached.dates;
    }
  } catch (e) { /* storage unavailable: just fetch */ }

  const from = new Date(today);
  from.setDate(today.getDate() - FIXTURE_WINDOW_DAYS_BACK);
  const to = new Date(today);
  to.setDate(today.getDate() + FIXTURE_WINDOW_DAYS_AHEAD);

  const res = await fetch(`${scoreboardUrl(league)}?dates=${formatDateForParam(from)}-${formatDateForParam(to)}&limit=500`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const dates = [...new Set((data.events || []).map(e => toParamDate(e.date)).filter(Boolean))].sort();

  // Sanity check: a genuine window of fixtures spans weeks. If we only got a few days back, ESPN
  // probably ignored the date range, so don't trust it (and don't cache it).
  if (dates.length < 2 || daysBetween(dates[0], dates[dates.length - 1]) < 14) return [];

  try { localStorage.setItem(cacheKey, JSON.stringify({ day: todayKey, dates })); } catch (e) { /* ignore */ }
  return dates;
}

async function initCalendar() {
  const league = currentLeague;          // if the user switches league while we wait, drop the late answer
  let dates = null;
  let source = '';

  try {
    const res = await fetch(scoreboardUrl(league));
    const data = await res.json();
    if (league !== currentLeague) return;
    dates = datesFromCalendar(data);
    if (dates) source = 'ESPN calendar';
  } catch (err) {
    console.error('Error reading calendar:', err);
  }

  if (!dates) {
    try {
      const found = await datesFromFixtures(league);
      if (league !== currentLeague) return;
      if (found.length) { dates = found; source = 'fixtures'; }
    } catch (err) {
      console.error('Error reading fixtures:', err);
    }
  }

  if (league !== currentLeague) return;
  if (!dates) { dates = fallbackDates(); source = 'every day (fallback)'; }

  matchDates = dates;
  console.info(`[QuietPitch] ${league}: ${dates.length} dates from ${source}`);
  setupInitialDateIndex();
}

function setupInitialDateIndex() {
  const todayStr = formatDateForParam(new Date());

  if (matchDates.length > 0) {
    if (currentMatchDateIndex === -1 || currentMatchDateIndex >= matchDates.length) {
      // Prefer the date the user was last looking at, otherwise the next day with games.
      currentMatchDateIndex = savedDate ? matchDates.indexOf(savedDate) : -1;
      if (currentMatchDateIndex === -1) {
        currentMatchDateIndex = matchDates.findIndex(d => d >= todayStr);
      }
      if (currentMatchDateIndex === -1) {
        currentMatchDateIndex = matchDates.length - 1;
      }
    }
  } else {
    matchDates = [todayStr];
    currentMatchDateIndex = 0;
  }

  populateDropdown();
  if (currentTab === 'matches') {
    loadMatchesForCurrentIndex();
  }
}

function rememberDate() {
  savedDate = matchDates[currentMatchDateIndex] || null;
  if (savedDate) localStorage.setItem('quiet_pitch_date', savedDate);
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
  if (currentTab !== 'matches') return;
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
      let homeScore = 0, awayScore = 0;
      let homeLogo = "", awayLogo = "";
      let homeScorersList = "";
      let awayScorersList = "";
      
      const homeComp = competitors.find(c => c.homeAway === "home");
      const awayComp = competitors.find(c => c.homeAway === "away");

      if (homeComp) {
        homeName = homeComp.team.shortDisplayName || homeComp.team.name || homeComp.team.displayName || "Home";
        homeScore = parseInt(homeComp.score || "0", 10);
        homeLogo = homeComp.team.logo || "";
      }
      if (awayComp) {
        awayName = awayComp.team.shortDisplayName || awayComp.team.name || awayComp.team.displayName || "Away";
        awayScore = parseInt(awayComp.score || "0", 10);
        awayLogo = awayComp.team.logo || "";
      }

      if (competitions.details && Array.isArray(competitions.details)) {
        const homeTeamId = homeComp?.team?.id;
        const homeScorers = [];
        const awayScorers = [];

        competitions.details.forEach(detail => {
          if (detail.scoringPlay && detail.athletesInvolved && detail.athletesInvolved.length > 0) {
            const scorerName = detail.athletesInvolved[0].shortName || detail.athletesInvolved[0].displayName;
            const minute = detail.clock?.displayValue || '';
            const scorerText = `${scorerName} ${minute}'`;

            if (detail.team?.id === homeTeamId) {
              homeScorers.push(scorerText);
            } else {
              awayScorers.push(scorerText);
            }
          }
        });

        homeScorersList = homeScorers.join('<br>');
        awayScorersList = awayScorers.join('<br>');
      }
      
      const matchName = `${homeName} vs ${awayName}`;
      let scoreStr = `${homeScore} - ${awayScore}`;
      
      const isLiveMatch = (state === "in");
      let statusText = '';

      if (isLiveMatch) {
        const detailText = event.status.type.detail || 'LIVE';
        statusText = `<span class="pulsing-dot"></span>${detailText}`;
      } else {
        statusText = state === "post" ? "FULL TIME" : "SCHEDULED";
      }

      const isFinished = (state === "post" || state === "in");
      const totalGoals = homeScore + awayScore;
      const isDraw = homeScore === awayScore;
      const btts = (homeScore > 0 && awayScore > 0);
      
      return {
        id: matchId,
        teams: matchName,
        homeTeam: homeName,
        awayTeam: awayName,
        homeLogo: homeLogo,
        awayLogo: awayLogo,
        homeScorers: homeScorersList,
        awayScorers: awayScorersList,
        score: scoreStr,
        status: statusText,
        isLive: isLiveMatch,
        dateTime: dateTimeDisplay,
        hasGoalsText: isFinished ? (totalGoals > 0 ? 'Yes.' : 'No (0-0 draw / scoreless).') : 'Match not started yet.',
        howManyGoalsText: isFinished ? (totalGoals > 0 ? `${totalGoals} total goal${totalGoals === 1 ? '' : 's'} scored.` : '0 goals.') : 'N/A',
        isDrawText: isFinished ? (isDraw ? 'Yes, the match ended in a draw.' : 'No, there was a decisive winner.') : 'Match not started yet.',
        bttsText: isFinished ? (btts ? 'Yes, both teams scored.' : 'No (at least one team kept a clean sheet).') : 'Match not started yet.',
        highlightUrl: isFinished && state === "post" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(matchName + ' highlights')}` : '',
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
    if (globalSpoilersRevealed) {
      card.classList.add('expanded');
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="status ${match.isLive ? 'live-status' : ''}">${match.status}</span>
        <span>${match.dateTime}</span>
      </div>
      <div class="teams-container">
        <div class="team-side home ${globalSpoilersRevealed ? 'score-visible' : ''}">
          ${match.homeLogo ? `<img src="${match.homeLogo}" alt="" class="team-badge">` : ''}
          <div class="team-info-block">
            <span class="team-name">${match.homeTeam}</span>
            <div class="scorers ${globalSpoilersRevealed ? '' : 'hidden'}" id="home-scorers-${match.id}">${match.homeScorers || ''}</div>
          </div>
        </div>
        <div class="center-area">
          <span class="vs-divider ${globalSpoilersRevealed ? 'hidden' : ''}" id="vs-${match.id}">vs</span>
          <span class="score ${globalSpoilersRevealed ? '' : 'hidden'}" id="score-${match.id}">${match.score}</span>
        </div>
        <div class="team-side away ${globalSpoilersRevealed ? 'score-visible' : ''}">
          <div class="team-info-block">
            <span class="team-name">${match.awayTeam}</span>
            <div class="scorers ${globalSpoilersRevealed ? '' : 'hidden'}" id="away-scorers-${match.id}">${match.awayScorers || ''}</div>
          </div>
          ${match.awayLogo ? `<img src="${match.awayLogo}" alt="" class="team-badge">` : ''}
        </div>
      </div>
      
      <div class="hints-drawer hidden" id="hints-${match.id}">
        <div class="hint-block">
          <div class="hint-question" onclick="toggleSingleHint(this)"><span class="hint-bullet">•</span> Were there goals?</div>
          <div class="hint-answer hidden">${match.hasGoalsText}</div>
        </div>
        <div class="hint-block">
          <div class="hint-question" onclick="toggleSingleHint(this)"><span class="hint-bullet">•</span> If there were goals, how many?</div>
          <div class="hint-answer hidden">${match.howManyGoalsText}</div>
        </div>
        <div class="hint-block">
          <div class="hint-question" onclick="toggleSingleHint(this)"><span class="hint-bullet">•</span> Was it a draw?</div>
          <div class="hint-answer hidden">${match.isDrawText}</div>
        </div>
        <div class="hint-block">
          <div class="hint-question" onclick="toggleSingleHint(this)"><span class="hint-bullet">•</span> Did both teams score?</div>
          <div class="hint-answer hidden">${match.bttsText}</div>
        </div>
      </div>

      <div class="card-footer">
        <div class="footer-left">
          ${match.highlightUrl && match.highlightUrl !== '#' 
            ? `<a href="${match.highlightUrl}" target="_blank" rel="noopener noreferrer" class="highlight-btn">▶ Highlights</a>` 
            : '<span style="color:#6b7280; font-size:0.7rem;">No Video</span>'}
          <button class="hints-btn" onclick="toggleHints(${match.id})">💡 Hints</button>
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
  
  card.classList.toggle('expanded', isHidden);
  teamSides.forEach(side => side.classList.toggle('score-visible', isHidden));
  
  btn.textContent = isHidden ? 'Hide score' : 'Show score';
}

function toggleHints(matchId) {
  const hintsDrawer = document.getElementById(`hints-${matchId}`);
  const card = hintsDrawer.closest('.match-card');
  const isHidden = hintsDrawer.classList.contains('hidden');

  hintsDrawer.classList.toggle('hidden');
  card.classList.toggle('expanded', isHidden);
}

function toggleSingleHint(questionElement) {
  const answerElement = questionElement.nextElementSibling;
  if (answerElement) {
    answerElement.classList.toggle('hidden');
  }
}

function vote(matchId) {
  let savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};
  savedVotes[matchId] = savedVotes[matchId] === 1 ? 0 : 1;
  localStorage.setItem('spoiler_free_votes', JSON.stringify(savedVotes));
  
  if (currentTab === 'saved') {
    loadSavedMatches();
  } else {
    loadMatchesForCurrentIndex();
  }
}

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
  const cards = document.querySelectorAll('.match-card');
  const scoreSpans = document.querySelectorAll('.score');
  const vsSpans = document.querySelectorAll('.vs-divider');
  const scorersBlocks = document.querySelectorAll('.scorers');
  const revealBtns = document.querySelectorAll('.reveal-btn');
  const teamSides = document.querySelectorAll('.team-side');

  cards.forEach(card => {
    if (show) card.classList.add('expanded');
    else card.classList.remove('expanded');
  });

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

if (leagueSelect) {
  leagueSelect.addEventListener('change', (e) => {
    currentLeague = e.target.value;
    localStorage.setItem('quiet_pitch_league', currentLeague);
    
    localStorage.removeItem('quiet_pitch_date');
    savedDate = null;
    currentMatchDateIndex = -1;

    const selectedText = e.target.options[e.target.selectedIndex].text;
    if (titleEl && currentTab === 'matches') titleEl.textContent = selectedText;
    
    if (currentTab === 'matches') {
      initCalendar();
    } else if (currentTab === 'saved') {
      loadSavedMatches();
    }
  });
}

dateSelect.addEventListener('change', (e) => {
  currentMatchDateIndex = parseInt(e.target.value);
  rememberDate();
  loadMatchesForCurrentIndex();
});

prevBtn.addEventListener('click', () => {
  if (currentMatchDateIndex > 0) {
    currentMatchDateIndex--;
    rememberDate();
    loadMatchesForCurrentIndex();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentMatchDateIndex < matchDates.length - 1) {
    currentMatchDateIndex++;
    rememberDate();
    loadMatchesForCurrentIndex();
  }
});

initCalendar();

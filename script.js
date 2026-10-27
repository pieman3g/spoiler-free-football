const container = document.getElementById('matches-container');
const subtitleEl = document.querySelector('.section-subtitle');

async function loadMatches() {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
    if (!response.ok) throw new Error("Failed to fetch live data");
    
    const data = await response.json();
    const events = data.events || [];
    
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">No matches scheduled for today.</p>';
      if (subtitleEl) subtitleEl.textContent = "No matches scheduled";
      return;
    }
    
    const firstDate = new Date(events[0].date);
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDateHeader = firstDate.toLocaleDateString('en-GB', optionsDate);
    if (subtitleEl) {
      subtitleEl.textContent = `${events.length} matches on ${formattedDateHeader}`;
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
      
      competitors.forEach(comp => {
        const teamInfo = comp.team;
        if (comp.homeAway === "home") {
          homeName = teamInfo.shortDisplayName || teamInfo.name;
          homeScore = comp.score || "0";
          homeLogo = teamInfo.logo || "";
        } else if (comp.homeAway === "away") {
          awayName = teamInfo.shortDisplayName || teamInfo.name;
          awayScore = comp.score || "0";
          awayLogo = teamInfo.logo || "";
        }
      });
      
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
        highlightUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(matchName + ' highlights')}`,
        upvotes: 0,
        downvotes: 0
      };
    });
    
    renderMatches(matches);
  } catch (error) {
    console.error("Error loading live matches, using fallback:", error);
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

  matches.matchList = matches; // reference
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
        <div class="team-side home">
          ${match.homeLogo ? `<img src="${match.homeLogo}" alt="" class="team-badge">` : ''}
          <div class="team-info-block">
            <span class="team-name">${match.homeTeam}</span>
            <div class="scorers hidden" id="home-scorers-${match.id}"></div>
          </div>
        </div>
        <div class="center-area">
          <span class="vs-divider" id="vs-${match.id}">vs</span>
          <span class="score hidden" id="score-${match.id}">${match.score}</span>
        </div>
        <div class="team-side away">
          <div class="team-info-block">
            <span class="team-name">${match.awayTeam}</span>
            <div class="scorers hidden" id="away-scorers-${match.id}"></div>
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
          <button class="reveal-btn" onclick="toggleScore(event, ${match.id})">Show score</button>
          <button class="vote-btn ${userVote === 1 ? 'active' : ''}" onclick="vote(${match.id})">★ Save</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function toggleScore(event, matchId) {
  const scoreSpan = document.getElementById(`score-${matchId}`);
  const vsSpan = document.getElementById(`vs-${matchId}`);
  const homeScorers = document.getElementById(`home-scorers-${matchId}`);
  const awayScorers = document.getElementById(`away-scorers-${matchId}`);
  const btn = event.target;
  
  const isHidden = scoreSpan.classList.contains('hidden');

  scoreSpan.classList.toggle('hidden');
  vsSpan.classList.toggle('hidden');
  if (homeScorers) homeScorers.classList.toggle('hidden');
  if (awayScorers) awayScorers.classList.toggle('hidden');
  
  btn.textContent = isHidden ? 'Hide score' : 'Show score';

  // Fetch individual goalscorers on demand when revealing for the first time
  if (isHidden && homeScorers.innerHTML === '') {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${matchId}`);
      const summaryData = await res.json();
      
      if (summaryData.details && summaryData.details.length > 0) {
        let homeHtml = '';
        let awayHtml = '';
        
        const homeTeamId = summaryData.boxscore?.teams?.[0]?.team?.id;

        summaryData.details.forEach(detail => {
          if (detail.scoringPlay) {
            let playerName = "Goal";
            if (detail.athletes && detail.athletes.length > 0) {
              playerName = detail.athletes[0].displayName || detail.athletes[0].shortName;
            } else if (detail.text) {
              playerName = detail.text;
            }
            
            const timeMin = detail.clock?.displayValue ? `${detail.clock.displayValue}'` : '';
            const scoringTeamId = detail.team?.id;
            const isHomeGoal = (scoringTeamId === homeTeamId);

            const goalLine = `<div>⚽ ${playerName} ${timeMin}</div>`;
            if (isHomeGoal) {
              homeHtml += goalLine;
            } else {
              awayHtml += goalLine;
            }
          }
        });

        homeScorers.innerHTML = homeHtml;
        awayScorers.innerHTML = awayHtml;
      }
    } catch (err) {
      console.error("Could not load match summary details:", err);
    }
  }
}

function vote(matchId) {
  let savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};
  savedVotes[matchId] = savedVotes[matchId] === 1 ? 0 : 1;
  localStorage.setItem('spoiler_free_votes', JSON.stringify(savedVotes));
  loadMatches();
}

loadMatches();

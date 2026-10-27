const container = document.getElementById('matches-container');

async function loadMatches() {
  try {
    // Fetch directly from ESPN's public Premier League scoreboard endpoint
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
    if (!response.ok) throw new Error("Failed to fetch live data");
    
    const data = await response.json();
    const events = data.get("events", []) || data.events || [];
    
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No matches scheduled for today.</p>';
      return;
    }
    
    const matches = events.map(event => {
      const matchId = event.id;
      const statusType = event.status.type;
      const state = statusType.state; // "pre", "in", "post"
      const detail = statusType.detail; // e.g., "Scheduled", "45'+2", "FT"
      
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
      let statusDisplay = detail;
      
      if (state === "in") {
        scoreStr = `${homeScore} - ${awayScore}`;
        statusDisplay = `LIVE ${detail}`;
      } else if (state === "post") {
        scoreStr = `${homeScore} - ${awayScore}`;
        statusDisplay = "FT";
      }

      return {
        id: matchId,
        teams: matchName,
        homeTeam: homeName,
        awayTeam: awayName,
        homeLogo: homeLogo,
        awayLogo: awayLogo,
        score: scoreStr,
        status: statusDisplay,
        highlightUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(matchName + ' highlights')}`,
        upvotes: 0,
        downvotes: 0
      };
    });
    
    renderMatches(matches);
  } catch (error) {
    console.error("Error loading live matches:", error);
    // Fallback to loading your static matches.json if the direct API call fails
    loadFallbackMatches();
  }
}

async function loadFallbackMatches() {
  try {
    const response = await fetch('matches.json?t=' + new Date().getTime());
    const matches = await response.json();
    renderMatches(matches);
  } catch (err) {
    container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">Unable to load matches.</p>';
  }
}

function renderMatches(matches) {
  container.innerHTML = '';

  const savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};

  matches.forEach(match => {
    const userVote = savedVotes[match.id] || 0;
    const currentUpvotes = (match.upvotes || 0) + (userVote === 1 ? 1 : 0);
    const currentDownvotes = (match.downvotes || 0) + (userVote === -1 ? 1 : 0);

    const row = document.createElement('div');
    row.classList.add('match-row');

    let teamsHtml = `
      <div class="team-group">
        ${match.homeLogo ? `<img src="${match.homeLogo}" alt="" class="team-badge" width="22" height="22">` : ''}
        <span>${match.homeTeam}</span>
      </div>
      <span class="vs-text">vs</span>
      <div class="team-group">
        ${match.awayLogo ? `<img src="${match.awayLogo}" alt="" class="team-badge" width="22" height="22">` : ''}
        <span>${match.awayTeam}</span>
      </div>
    `;

    row.innerHTML = `
      <div class="match-meta">
        <span style="color: #6c757d; font-weight: bold; font-size: 0.8rem;">${match.status || 'FT'}</span>
      </div>
      <div class="match-teams">${teamsHtml}</div>
      <div>
        ${match.highlightUrl && match.highlightUrl !== '#' 
          ? `<a href="${match.highlightUrl}" target="_blank" rel="noopener noreferrer" class="highlight-btn">▶ Highlights</a>` 
          : '<span style="color:#adb5bd; font-size:0.85rem;">No Video</span>'}
      </div>
      <div class="score-area">
        <span class="score hidden" id="score-${match.id}">${match.score}</span>
        <button class="reveal-btn" onclick="toggleScore(${match.id})">Reveal</button>
      </div>
      <div class="vote-section">
        <button class="vote-btn ${userVote === 1 ? 'active' : ''}" onclick="vote(${match.id}, 'up')">👍 <span>${currentUpvotes}</span></button>
        <button class="vote-btn ${userVote === -1 ? 'active' : ''}" onclick="vote(${match.id}, 'down')">👎 <span>${currentDownvotes}</span></button>
      </div>
    `;

    container.appendChild(row);
  });
}

function toggleScore(matchId) {
  const scoreSpan = document.getElementById(`score-${matchId}`);
  const btn = event.target;
  
  scoreSpan.classList.toggle('hidden');
  btn.textContent = scoreSpan.classList.contains('hidden') ? 'Reveal' : 'Hide';
}

function vote(matchId, type) {
  let savedVotes = JSON.parse(localStorage.getItem('spoiler_free_votes')) || {};
  
  if (type === 'up') {
    savedVotes[matchId] = savedVotes[matchId] === 1 ? 0 : 1;
  } else if (type === 'down') {
    savedVotes[matchId] = savedVotes[matchId] === -1 ? 0 : -1;
  }

  localStorage.setItem('spoiler_free_votes', JSON.stringify(savedVotes));
  loadMatches();
}

loadMatches();

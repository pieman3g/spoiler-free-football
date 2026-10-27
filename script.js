const container = document.getElementById('matches-container');

let matches = JSON.parse(localStorage.getItem('spoiler_free_matches')) || [
  { id: 1, teams: "Arsenal vs Liverpool", score: "2 - 1", status: "LIVE 82'", upvotes: 142, downvotes: 4 },
  { id: 2, teams: "Real Madrid vs Barcelona", score: "3 - 3", status: "FT", upvotes: 215, downvotes: 14 },
  { id: 3, teams: "Manchester City vs Chelsea", score: "1 - 1", status: "LIVE 65'", upvotes: 189, downvotes: 11 },
  { id: 4, teams: "Bayern Munich vs Dortmund", score: "4 - 0", status: "FT", upvotes: 98, downvotes: 5 }
];

function renderMatches() {
  container.innerHTML = '';

  matches.forEach(match => {
    const row = document.createElement('div');
    row.classList.add('match-row');

    const isLive = match.status.includes('LIVE');
    const statusColor = isLive ? '#e63946' : '#6c757d';

    row.innerHTML = `
      <div class="match-meta">
        <span style="color: ${statusColor}; font-weight: bold;">${isLive ? '● ' : ''}${match.status}</span>
      </div>
      <div class="match-teams">${match.teams}</div>
      <div class="score-area">
        <span class="score hidden" id="score-${match.id}">${match.score}</span>
        <button class="reveal-btn" onclick="toggleScore(${match.id})">Reveal</button>
      </div>
      <div class="vote-section">
        <button class="vote-btn" onclick="vote(${match.id}, 'up')" title="Worth Watching">👍 <span>${match.upvotes}</span></button>
        <button class="vote-btn" onclick="vote(${match.id}, 'down')" title="Not Worth Watching">👎 <span>${match.downvotes}</span></button>
      </div>
    `;

    container.appendChild(row);
  });
}

function toggleScore(matchId) {
  const scoreSpan = document.getElementById(`score-${matchId}`);
  const btn = event.target;
  
  scoreSpan.classList.toggle('hidden');
  
  if (scoreSpan.classList.contains('hidden')) {
    btn.textContent = 'Reveal';
  } else {
    btn.textContent = 'Hide';
  }
}

function vote(matchId, type) {
  const match = matches.find(m => m.id === matchId);
  if (type === 'up') match.upvotes++;
  if (type === 'down') match.downvotes++;
  
  localStorage.setItem('spoiler_free_matches', JSON.stringify(matches));
  renderMatches();
}

renderMatches();

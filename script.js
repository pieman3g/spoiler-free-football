const container = document.getElementById('matches-container');

async function loadMatches() {
  try {
    // Add a timestamp parameter (?t=...) to prevent browser caching of matches.json
    const response = await fetch('matches.json?t=' + new Date().getTime());
    if (!response.ok) throw new Error("matches.json not found");
    
    const matches = await response.json();
    
    if (!matches || matches.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No matches available right now. Check back soon!</p>';
      return;
    }
    
    renderMatches(matches);
  } catch (error) {
    console.error("Error loading matches:", error);
    container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">Waiting for automation script to generate matches.json...</p>';
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

    row.innerHTML = `
      <div class="match-meta">
        <span style="color: #6c757d; font-weight: bold;">${match.status || 'FT'}</span>
      </div>
      <div class="match-teams">${match.teams}</div>
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

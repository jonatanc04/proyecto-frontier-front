const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

async function requestJson(path, { method = 'GET', params = {}, body } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `La API respondio con estado ${response.status}.`;

    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        errorMessage = String(errorBody.detail);
      }
    } catch (error) {
      // Si la respuesta no es JSON, mantenemos el mensaje generico.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getLeagues() {
  return requestJson('/leagues');
}

export function getSeasons(leagueId) {
  return requestJson('/seasons', { params: { league_id: leagueId } });
}

export function getTeams({ leagueId, seasonId, includePlayers = false }) {
  return requestJson('/teams', {
    params: {
      league_id: leagueId,
      season_id: seasonId,
      include_players: includePlayers,
    },
  });
}

export function getTeam(teamId, { leagueId, seasonId, includePlayers = true } = {}) {
  return requestJson(`/teams/${teamId}`, {
    params: {
      league_id: leagueId,
      season_id: seasonId,
      include_players: includePlayers,
    },
  });
}

export function createLeague({ name }) {
  return requestJson('/leagues', {
    method: 'POST',
    body: { name },
  });
}

export function updateLeague(leagueId, { name }) {
  return requestJson(`/leagues/${leagueId}`, {
    method: 'PATCH',
    body: { name },
  });
}

export function deleteLeague(leagueId) {
  return requestJson(`/leagues/${leagueId}`, {
    method: 'DELETE',
  });
}

export function createSeason(payload) {
  return requestJson('/seasons', {
    method: 'POST',
    body: payload,
  });
}

export function updateSeason(seasonId, payload) {
  return requestJson(`/seasons/${seasonId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteSeason(seasonId, leagueId) {
  return requestJson(`/seasons/${seasonId}`, {
    method: 'DELETE',
    params: { league_id: leagueId },
  });
}

export function createTeam(payload) {
  return requestJson('/teams', {
    method: 'POST',
    body: payload,
  });
}

export function addExistingTeamToSeason(teamId, payload) {
  return requestJson(`/teams/${teamId}/participations`, {
    method: 'POST',
    body: payload,
  });
}

export function deleteTeamFromSeason(teamId, payload) {
  return requestJson(`/teams/${teamId}/participations`, {
    method: 'DELETE',
    body: payload,
  });
}

export function createTeamPlayer(teamId, payload) {
  return requestJson(`/teams/${teamId}/players`, {
    method: 'POST',
    body: payload,
  });
}

export function updateTeamPlayer(teamId, playerId, payload) {
  return requestJson(`/teams/${teamId}/players/${playerId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteTeamPlayer(teamId, playerId, payload) {
  return requestJson(`/teams/${teamId}/players/${playerId}`, {
    method: 'DELETE',
    body: payload,
  });
}

export function moveTeamPlayer(payload) {
  return requestJson('/teams/players/transfer', {
    method: 'POST',
    body: payload,
  });
}

export function getTransfers({ leagueId, seasonId } = {}) {
  return requestJson('/transfers', {
    params: {
      league_id: leagueId,
      season_id: seasonId,
    },
  });
}

export function createTransfer(payload) {
  return requestJson('/transfers', {
    method: 'POST',
    body: payload,
  });
}

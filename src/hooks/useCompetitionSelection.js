import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'frontier-selection';

function readStoredSelection() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return { leagueId: '', seasonId: '' };
    }

    const parsedValue = JSON.parse(storedValue);
    return {
      leagueId: parsedValue.leagueId ? String(parsedValue.leagueId) : '',
      seasonId: parsedValue.seasonId ? String(parsedValue.seasonId) : '',
    };
  } catch (error) {
    return { leagueId: '', seasonId: '' };
  }
}

function writeStoredSelection({ leagueId, seasonId }) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        leagueId: leagueId ? String(leagueId) : '',
        seasonId: seasonId ? String(seasonId) : '',
      })
    );
  } catch (error) {
    // Ignoramos errores de almacenamiento para no bloquear la navegacion.
  }
}

export function useCompetitionSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const leagueId = searchParams.get('leagueId') || '';
  const seasonId = searchParams.get('seasonId') || '';

  useEffect(() => {
    if (leagueId || seasonId) {
      writeStoredSelection({ leagueId, seasonId });
      return;
    }

    const storedSelection = readStoredSelection();
    if (!storedSelection.leagueId && !storedSelection.seasonId) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (storedSelection.leagueId) {
      nextParams.set('leagueId', storedSelection.leagueId);
    }
    if (storedSelection.seasonId) {
      nextParams.set('seasonId', storedSelection.seasonId);
    }
    setSearchParams(nextParams, { replace: true });
  }, [leagueId, seasonId, setSearchParams]);

  const updateSelection = useCallback((nextLeagueId, nextSeasonId) => {
    const normalizedSelection = {
      leagueId: nextLeagueId ? String(nextLeagueId) : '',
      seasonId: nextSeasonId ? String(nextSeasonId) : '',
    };

    const nextParams = new URLSearchParams();
    if (normalizedSelection.leagueId) {
      nextParams.set('leagueId', normalizedSelection.leagueId);
    }
    if (normalizedSelection.seasonId) {
      nextParams.set('seasonId', normalizedSelection.seasonId);
    }

    writeStoredSelection(normalizedSelection);
    setSearchParams(nextParams, { replace: true });
  }, [setSearchParams]);

  return {
    leagueId,
    seasonId,
    updateSelection,
  };
}

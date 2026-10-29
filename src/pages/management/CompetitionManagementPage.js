import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompetitionSelection } from '../../hooks/useCompetitionSelection';
import {
  createLeague,
  createSeason,
  deleteLeague,
  deleteSeason,
  getLeagues,
  getSeasons,
} from '../../services/frontierApi';
import './ManagementPages.css';

function CompetitionManagementPage() {
  const { leagueId: selectedLeagueId, seasonId: selectedSeasonId, updateSelection } =
    useCompetitionSelection();
  const [leagues, setLeagues] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [creationLeagueSeasons, setCreationLeagueSeasons] = useState([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [seasonName, setSeasonName] = useState('');
  const [seasonLeagueId, setSeasonLeagueId] = useState('');
  const [seasonSourceId, setSeasonSourceId] = useState('');
  const [copyTeams, setCopyTeams] = useState(false);
  const [copyPlayers, setCopyPlayers] = useState(false);
  const [copyPlayerData, setCopyPlayerData] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedLeague = useMemo(
    () => leagues.find((league) => String(league.id) === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );
  const selectedSeason = useMemo(
    () => seasons.find((season) => String(season.id) === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId]
  );
  const seasonsForCreationLeague = useMemo(
    () =>
      creationLeagueSeasons.filter(
        (season) => String(season.id) !== selectedSeasonId
      ),
    [creationLeagueSeasons, selectedSeasonId]
  );
  const selectionQuery = new URLSearchParams();

  if (selectedLeagueId) {
    selectionQuery.set('leagueId', selectedLeagueId);
  }
  if (selectedSeasonId) {
    selectionQuery.set('seasonId', selectedSeasonId);
  }

  const selectionSuffix = selectionQuery.toString()
    ? `?${selectionQuery.toString()}`
    : '';

  useEffect(() => {
    let isMounted = true;

    async function loadLeagues() {
      setIsLoadingLeagues(true);

      try {
        const leaguesData = await getLeagues();
        if (!isMounted) {
          return;
        }
        setLeagues(leaguesData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage('No se pudieron cargar las ligas.');
      } finally {
        if (isMounted) {
          setIsLoadingLeagues(false);
        }
      }
    }

    loadLeagues();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingLeagues || leagues.length === 0) {
      return;
    }

    const hasSelectedLeague = leagues.some(
      (league) => String(league.id) === selectedLeagueId
    );

    if (!hasSelectedLeague) {
      updateSelection(leagues[0].id, null);
      return;
    }

    if (!seasonLeagueId) {
      setSeasonLeagueId(selectedLeagueId || String(leagues[0].id));
    }
  }, [
    isLoadingLeagues,
    leagues,
    seasonLeagueId,
    selectedLeagueId,
    updateSelection,
  ]);

  useEffect(() => {
    if (!selectedLeagueId) {
      setSeasons([]);
      return;
    }

    let isMounted = true;

    async function loadSeasons() {
      setIsLoadingSeasons(true);

      try {
        const seasonsData = await getSeasons(selectedLeagueId);
        if (!isMounted) {
          return;
        }
        setSeasons(seasonsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSeasons([]);
        setErrorMessage('No se pudieron cargar las temporadas.');
      } finally {
        if (isMounted) {
          setIsLoadingSeasons(false);
        }
      }
    }

    loadSeasons();

    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId]);

  useEffect(() => {
    if (!seasonLeagueId) {
      setCreationLeagueSeasons([]);
      return;
    }

    let isMounted = true;

    async function loadCreationLeagueSeasons() {
      try {
        const seasonsData = await getSeasons(seasonLeagueId);
        if (!isMounted) {
          return;
        }
        setCreationLeagueSeasons(seasonsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setCreationLeagueSeasons([]);
      }
    }

    loadCreationLeagueSeasons();

    return () => {
      isMounted = false;
    };
  }, [seasonLeagueId]);

  useEffect(() => {
    if (!seasonLeagueId) {
      setSeasonSourceId('');
      return;
    }

    const hasSelectedSourceSeason = creationLeagueSeasons.some(
      (season) => String(season.id) === seasonSourceId
    );

    if (hasSelectedSourceSeason) {
      return;
    }

    const preferredSourceSeason = creationLeagueSeasons.find(
      (season) =>
        String(season.id) === selectedSeasonId &&
        String(season.id_league) === String(seasonLeagueId)
    );

    if (preferredSourceSeason) {
      setSeasonSourceId(String(preferredSourceSeason.id));
      return;
    }

    if (creationLeagueSeasons.length > 0) {
      setSeasonSourceId(String(creationLeagueSeasons[0].id));
      return;
    }

    setSeasonSourceId('');
  }, [creationLeagueSeasons, seasonLeagueId, seasonSourceId, selectedSeasonId]);

  useEffect(() => {
    if (!selectedLeagueId || isLoadingSeasons || seasons.length === 0) {
      return;
    }

    const hasSelectedSeason = seasons.some(
      (season) => String(season.id) === selectedSeasonId
    );

    if (!hasSelectedSeason) {
      updateSelection(selectedLeagueId, seasons[0].id);
    }
  }, [isLoadingSeasons, seasons, selectedLeagueId, selectedSeasonId, updateSelection]);

  const handleCreateLeague = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const createdLeague = await createLeague({ name: leagueName });
      setLeagueName('');
      setSuccessMessage('Liga creada correctamente.');
      const leaguesData = await getLeagues();
      setLeagues(leaguesData);
      updateSelection(createdLeague.id, null);
      setSeasonLeagueId(String(createdLeague.id));
    } catch (error) {
      setErrorMessage('No se pudo crear la liga.');
    }
  };

  const handleCreateSeason = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (copyTeams && !seasonSourceId) {
      setErrorMessage('Selecciona una temporada origen antes de copiar equipos o plantillas.');
      return;
    }

    try {
      const createdSeason = await createSeason({
        league_id: Number(seasonLeagueId),
        name: seasonName,
        source_season_id: seasonSourceId ? Number(seasonSourceId) : null,
        copy_teams: copyTeams,
        copy_players: copyTeams && copyPlayers,
        copy_player_data: copyTeams && copyPlayers && copyPlayerData,
      });

      setSeasonName('');
      setSeasonSourceId('');
      setCopyTeams(false);
      setCopyPlayers(false);
      setCopyPlayerData(false);
      setSuccessMessage('Temporada creada correctamente.');

      if (String(createdSeason.id_league) === selectedLeagueId) {
        const seasonsData = await getSeasons(selectedLeagueId);
        setSeasons(seasonsData);
      }

      if (String(createdSeason.id_league) === String(seasonLeagueId)) {
        const creationSeasonsData = await getSeasons(seasonLeagueId);
        setCreationLeagueSeasons(creationSeasonsData);
      }

      updateSelection(createdSeason.id_league, createdSeason.id);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo crear la temporada.');
    }
  };

  const handleDeleteLeague = async (league) => {
    const confirmed = window.confirm(
      `Vas a borrar la liga "${league.name}" y todas sus temporadas, equipos en temporada y plantillas asociadas.`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteLeague(league.id);
      const leaguesData = await getLeagues();
      setLeagues(leaguesData);
      setSeasons([]);
      setCreationLeagueSeasons([]);

      if (leaguesData.length > 0) {
        const nextLeagueId = String(leaguesData[0].id);
        updateSelection(nextLeagueId, '');
        setSeasonLeagueId(nextLeagueId);
      } else {
        updateSelection('', '');
        setSeasonLeagueId('');
      }

      setSuccessMessage('Liga eliminada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la liga.');
    }
  };

  const handleDeleteSeason = async (season) => {
    const confirmed = window.confirm(
      `Vas a borrar la temporada "${season.name}" y las plantillas asociadas a esa temporada.`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteSeason(season.id, season.id_league);
      const seasonsData = await getSeasons(season.id_league);

      if (String(season.id_league) === selectedLeagueId) {
        setSeasons(seasonsData);
        if (seasonsData.length > 0) {
          updateSelection(selectedLeagueId, seasonsData[0].id);
        } else {
          updateSelection(selectedLeagueId, '');
        }
      }

      if (String(season.id_league) === String(seasonLeagueId)) {
        setCreationLeagueSeasons(seasonsData);
      }

      setSuccessMessage('Temporada eliminada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la temporada.');
    }
  };

  return (
    <section className="page-section management-page">
      <div className="management-toolbar">
        <Link className="back-link" to={`/${selectionSuffix}`}>
          Volver al inicio
        </Link>
        <div className="management-toolbar__spacer" />
        <Link className="management-link-button" to={`/management/teams${selectionSuffix}`}>
          Ir a gestión de equipos
        </Link>
      </div>

      <header className="page-header">
        <p className="page-eyebrow">Gestión</p>
        <h1 className="page-title">Competiciones</h1>
        <p className="page-description">
          Aquí creas ligas y temporadas. La temporada siempre queda asociada a
          la liga que elijas en el formulario.
        </p>
      </header>

      {errorMessage ? <div className="panel panel-empty">{errorMessage}</div> : null}
      {successMessage ? (
        <div className="panel panel-empty management-feedback--success">
          {successMessage}
        </div>
      ) : null}

      <section className="panel management-context">
        <div className="management-context__header">
          <h2 className="management-context__title">Contexto cargado</h2>
          {selectedLeague ? (
            <span className="meta-pill">Liga: {selectedLeague.name}</span>
          ) : null}
          {selectedSeason ? (
            <span className="meta-pill">Temporada: {selectedSeason.name}</span>
          ) : null}
        </div>

        <div className="management-context__fields">
          <label className="management-field">
            <span>Liga activa</span>
            <select
              value={selectedLeagueId}
              onChange={(event) => updateSelection(event.target.value, null)}
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </label>

          <label className="management-field">
            <span>Temporada activa</span>
            <select
              value={selectedSeasonId}
              onChange={(event) => updateSelection(selectedLeagueId, event.target.value)}
              disabled={!selectedLeagueId || seasons.length === 0}
            >
              {seasons.length === 0 ? (
                <option value="">Sin temporadas</option>
              ) : (
                seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="management-grid">
        <article className="panel management-card">
          <h2 className="management-card__title">Crear liga</h2>
          <p className="management-card__subtitle">
            Añade una liga nueva al catálogo general.
          </p>
          <form className="management-form" onSubmit={handleCreateLeague}>
            <label className="management-field">
              <span>Nombre de la liga</span>
              <input
                type="text"
                value={leagueName}
                onChange={(event) => setLeagueName(event.target.value)}
                placeholder="Ej. Super Frontier"
              />
            </label>
            <button className="management-primary-button" type="submit">
              Crear liga
            </button>
          </form>
        </article>

        <article className="panel management-card">
          <h2 className="management-card__title">Crear temporada</h2>
          <p className="management-card__subtitle">
            Elige a qué liga se asocia y si quieres copiar la estructura de una
            temporada anterior.
          </p>
          <form className="management-form" onSubmit={handleCreateSeason}>
            <label className="management-field">
              <span>Liga asociada</span>
              <select
                value={seasonLeagueId}
                onChange={(event) => setSeasonLeagueId(event.target.value)}
              >
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="management-field">
              <span>Nombre de la temporada</span>
              <input
                type="text"
                value={seasonName}
                onChange={(event) => setSeasonName(event.target.value)}
                placeholder="Ej. Temporada 2"
              />
            </label>

            <label className="management-field">
              <span>Temporada origen</span>
              <select
                value={seasonSourceId}
                onChange={(event) => setSeasonSourceId(event.target.value)}
                disabled={!seasonLeagueId || seasonsForCreationLeague.length === 0}
              >
                <option value="">Sin copia</option>
                {seasonsForCreationLeague.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="management-check">
              <input
                type="checkbox"
                checked={copyTeams}
                onChange={(event) => {
                  const isChecked = event.target.checked;
                  setCopyTeams(isChecked);
                  if (isChecked && !seasonSourceId && seasonsForCreationLeague.length > 0) {
                    setSeasonSourceId(String(seasonsForCreationLeague[0].id));
                  }
                  if (!isChecked) {
                    setCopyPlayers(false);
                    setCopyPlayerData(false);
                  }
                }}
              />
              <span>Copiar equipos de la temporada origen</span>
            </label>

            <label className="management-check">
              <input
                type="checkbox"
                checked={copyPlayers}
                disabled={!copyTeams}
                onChange={(event) => {
                  const isChecked = event.target.checked;
                  setCopyPlayers(isChecked);
                  if (!isChecked) {
                    setCopyPlayerData(false);
                  }
                }}
              />
              <span>Copiar jugadores de cada equipo</span>
            </label>

            <label className="management-check">
              <input
                type="checkbox"
                checked={copyPlayerData}
                disabled={!copyTeams || !copyPlayers}
                onChange={(event) => setCopyPlayerData(event.target.checked)}
              />
              <span>Copiar datos de los jugadores del equipo</span>
            </label>

            <button className="management-primary-button" type="submit">
              Crear temporada
            </button>
          </form>
        </article>
      </section>

      <section className="management-grid">
        <article className="panel management-card">
          <h2 className="management-card__title">Ligas disponibles</h2>
          {isLoadingLeagues ? (
            <div className="panel-empty">Cargando ligas...</div>
          ) : (
            <div className="management-list">
              {leagues.map((league) => (
                <div
                  key={league.id}
                  className="panel management-list__item"
                >
                  <div>
                    <p className="management-list__title">{league.name}</p>
                  </div>
                  <div className="management-list__meta">
                    <span className="meta-pill">Liga #{league.id}</span>
                    <button
                      type="button"
                      className="management-secondary-button"
                      onClick={() => updateSelection(league.id, '')}
                    >
                      Cargar
                    </button>
                    <button
                      type="button"
                      className="management-danger-button"
                      onClick={() => handleDeleteLeague(league)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel management-card">
          <h2 className="management-card__title">Temporadas de la liga activa</h2>
          {isLoadingSeasons ? (
            <div className="panel-empty">Cargando temporadas...</div>
          ) : seasons.length === 0 ? (
            <div className="panel-empty">Esta liga todavía no tiene temporadas.</div>
          ) : (
            <div className="management-list">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="panel management-list__item"
                >
                  <div>
                    <p className="management-list__title">{season.name}</p>
                  </div>
                  <div className="management-list__meta">
                    <span className="meta-pill">Temporada #{season.id}</span>
                    <button
                      type="button"
                      className="management-secondary-button"
                      onClick={() => updateSelection(selectedLeagueId, season.id)}
                    >
                      Cargar
                    </button>
                    <button
                      type="button"
                      className="management-danger-button"
                      onClick={() => handleDeleteSeason(season)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </section>
  );
}

export default CompetitionManagementPage;

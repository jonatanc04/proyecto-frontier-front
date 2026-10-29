import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompetitionSelection } from '../../hooks/useCompetitionSelection';
import { getLeagues, getSeasons, getTeams } from '../../services/frontierApi';
import './HomePage.css';

function getTeamDisplayName(team) {
  return team.name && team.name.trim() ? team.name : `Equipo ${team.id}`;
}

function HomePage() {
  const { leagueId: selectedLeagueId, seasonId: selectedSeasonId, updateSelection } =
    useCompetitionSelection();
  const [leagues, setLeagues] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeSelectorModal, setActiveSelectorModal] = useState(null);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedLeague = useMemo(
    () => leagues.find((league) => String(league.id) === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );
  const selectedSeason = useMemo(
    () => seasons.find((season) => String(season.id) === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId]
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((firstTeam, secondTeam) =>
      getTeamDisplayName(firstTeam).localeCompare(getTeamDisplayName(secondTeam))
    ),
    [teams]
  );

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
        setErrorMessage('No se pudieron cargar las ligas disponibles.');
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

    const hasValidLeague = leagues.some(
      (league) => String(league.id) === selectedLeagueId
    );

    if (!hasValidLeague) {
      updateSelection(leagues[0].id, null);
    }
  }, [isLoadingLeagues, leagues, selectedLeagueId, updateSelection]);

  useEffect(() => {
    if (!selectedLeagueId) {
      setSeasons([]);
      setTeams([]);
      return;
    }

    let isMounted = true;

    async function loadSeasons() {
      setIsLoadingSeasons(true);
      setTeams([]);

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
        setErrorMessage('No se pudieron cargar las temporadas de la liga.');
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
    if (!selectedLeagueId || isLoadingSeasons) {
      return;
    }

    if (seasons.length === 0) {
      if (selectedSeasonId) {
        updateSelection(selectedLeagueId, null);
      }
      return;
    }

    const hasValidSeason = seasons.some(
      (season) => String(season.id) === selectedSeasonId
    );

    if (!hasValidSeason) {
      updateSelection(selectedLeagueId, seasons[0].id);
    }
  }, [isLoadingSeasons, seasons, selectedLeagueId, selectedSeasonId, updateSelection]);

  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      setTeams([]);
      return;
    }
    let isMounted = true;

    async function loadTeams() {
      setIsLoadingTeams(true);

      try {
        const teamsData = await getTeams({
          leagueId: selectedLeagueId,
          seasonId: selectedSeasonId,
          includePlayers: false,
        });
        if (!isMounted) {
          return;
        }
        setTeams(teamsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTeams([]);
        setErrorMessage('No se pudieron cargar los equipos de la temporada.');
      } finally {
        if (isMounted) {
          setIsLoadingTeams(false);
        }
      }
    }

    loadTeams();

    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId, selectedSeasonId]);

  const selectorModalTitle =
    activeSelectorModal === 'league'
      ? 'Cambiar liga'
      : activeSelectorModal === 'season'
        ? 'Cambiar temporada'
        : '';

  return (
    <section className="page-section">
      <header className="page-header">
        <p className="page-eyebrow">Competiciones</p>
        <h1 className="page-title">Selecciona liga, temporada y equipo</h1>
        <p className="page-description">
          Primero elige una liga, despues la temporada y por ultimo entra en el
          equipo para ver su informacion dentro de esa edicion.
        </p>
      </header>

      {errorMessage ? <div className="panel panel-empty">{errorMessage}</div> : null}

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">Selección rápida</h2>
          {selectedLeague && selectedSeason ? (
            <span className="meta-pill">
              {selectedLeague.name} · {selectedSeason.name}
            </span>
          ) : null}
        </div>

        <div className="selector-inline-grid">
          <button
            type="button"
            className="selector-inline-card panel"
            onClick={() => setActiveSelectorModal('league')}
            disabled={isLoadingLeagues || leagues.length === 0}
          >
            <span className="selector-inline-card__label">Liga</span>
            <strong className="selector-inline-card__value">
              {isLoadingLeagues
                ? 'Cargando...'
                : selectedLeague?.name || 'Sin ligas'}
            </strong>
          </button>

          <button
            type="button"
            className="selector-inline-card panel"
            onClick={() => setActiveSelectorModal('season')}
            disabled={!selectedLeague || isLoadingSeasons || seasons.length === 0}
          >
            <span className="selector-inline-card__label">Temporada</span>
            <strong className="selector-inline-card__value">
              {!selectedLeague
                ? 'Selecciona una liga'
                : isLoadingSeasons
                  ? 'Cargando...'
                  : selectedSeason?.name || 'Sin temporadas'}
            </strong>
          </button>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">Equipos</h2>
          {selectedLeague && selectedSeason ? (
            <span className="meta-pill">
              {selectedLeague.name} · {selectedSeason.name}
            </span>
          ) : null}
        </div>

        {!selectedLeague || !selectedSeason ? (
          <div className="panel panel-empty">
            Elige una liga y una temporada para ver sus equipos.
          </div>
        ) : isLoadingTeams ? (
          <div className="panel panel-empty">Cargando equipos...</div>
        ) : sortedTeams.length === 0 ? (
          <div className="panel panel-empty">
            No hay equipos cargados en la temporada seleccionada.
          </div>
        ) : (
          <div className="team-grid">
            {sortedTeams.map((team) => {
              const teamName = getTeamDisplayName(team);

              return (
                <Link
                  key={team.id}
                  className="team-card panel"
                  to={`/team/${team.id}?leagueId=${selectedLeagueId}&seasonId=${selectedSeasonId}`}
                >
                  <div className="team-card__logo" aria-hidden="true">
                    {team.logo ? (
                      <img
                        className="team-card__logo-image"
                        src={team.logo}
                        alt=""
                      />
                    ) : (
                      <span>{teamName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="team-card__body">
                    <h2 className="team-card__title">{teamName}</h2>
                    <div className="team-card__meta">
                      <span className="meta-pill">
                        Jugadores: {team.summary?.total_players ?? 0}
                      </span>
                      <span className="meta-pill">
                        Campo: {team.field || 'Sin definir'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {activeSelectorModal ? (
        <div className="selector-modal">
          <div
            className="selector-modal__dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="selector-modal-title"
          >
            <div className="selector-modal__header">
              <h2 id="selector-modal-title" className="selector-modal__title">
                {selectorModalTitle}
              </h2>
              <button
                type="button"
                className="selector-modal__close"
                onClick={() => setActiveSelectorModal(null)}
                aria-label="Cerrar popup"
              >
                X
              </button>
            </div>

            <div className="selector-modal__body">
              {activeSelectorModal === 'league' ? (
                isLoadingLeagues ? (
                  <div className="panel-empty">Cargando ligas...</div>
                ) : leagues.length === 0 ? (
                  <div className="panel-empty">Todavía no hay ligas cargadas.</div>
                ) : (
                  <div className="selector-modal__options">
                    {leagues.map((league) => (
                      <button
                        key={league.id}
                        type="button"
                        className={
                          String(league.id) === selectedLeagueId
                            ? 'selector-modal__option selector-modal__option--active'
                            : 'selector-modal__option'
                        }
                        onClick={() => {
                          updateSelection(league.id, null);
                          setActiveSelectorModal(null);
                        }}
                      >
                        <span className="selector-modal__option-title">{league.name}</span>
                        <span className="meta-pill">Liga #{league.id}</span>
                      </button>
                    ))}
                  </div>
                )
              ) : !selectedLeague ? (
                <div className="panel-empty">Selecciona primero una liga.</div>
              ) : isLoadingSeasons ? (
                <div className="panel-empty">Cargando temporadas...</div>
              ) : seasons.length === 0 ? (
                <div className="panel-empty">
                  Esta liga no tiene temporadas disponibles.
                </div>
              ) : (
                <div className="selector-modal__options">
                  {seasons.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      className={
                        String(season.id) === selectedSeasonId
                          ? 'selector-modal__option selector-modal__option--active'
                          : 'selector-modal__option'
                      }
                      onClick={() => {
                        updateSelection(selectedLeagueId, season.id);
                        setActiveSelectorModal(null);
                      }}
                    >
                      <span className="selector-modal__option-title">{season.name}</span>
                      <span className="meta-pill">Temporada #{season.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default HomePage;

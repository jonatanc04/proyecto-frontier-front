import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompetitionSelection } from '../../hooks/useCompetitionSelection';
import {
  addExistingTeamToSeason,
  createTeam,
  createTeamPlayer,
  deleteTeamFromSeason,
  deleteTeamPlayer,
  getLeagues,
  getSeasons,
  getTeam,
  getTeams,
  moveTeamPlayer,
  updateTeamPlayer,
} from '../../services/frontierApi';
import './ManagementPages.css';

function getTeamDisplayName(team) {
  return team.name && team.name.trim() ? team.name : `Equipo ${team.id}`;
}

function getInitialTeamForm() {
  return {
    name: '',
    logo: '',
    field: '',
    fieldElement: '',
  };
}

function getInitialPlayerForm() {
  return {
    playerId: '',
    average: '',
    captain: '0',
  };
}

function TeamManagementPage() {
  const { leagueId: selectedLeagueId, seasonId: selectedSeasonId, updateSelection } =
    useCompetitionSelection();
  const [leagues, setLeagues] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allTeamsCatalog, setAllTeamsCatalog] = useState([]);
  const [managedTeamId, setManagedTeamId] = useState('');
  const [managedTeam, setManagedTeam] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingManagedTeam, setIsLoadingManagedTeam] = useState(false);
  const [teamForm, setTeamForm] = useState(getInitialTeamForm());
  const [existingTeamId, setExistingTeamId] = useState('');
  const [playerForm, setPlayerForm] = useState(getInitialPlayerForm());
  const [playerDrafts, setPlayerDrafts] = useState({});
  const [transferTargets, setTransferTargets] = useState({});
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
  const sortedTeams = useMemo(
    () => [...teams].sort((firstTeam, secondTeam) =>
      getTeamDisplayName(firstTeam).localeCompare(getTeamDisplayName(secondTeam))
    ),
    [teams]
  );
  const availableExistingTeams = useMemo(
    () => allTeamsCatalog.filter(
      (team) => !teams.some((seasonTeam) => seasonTeam.id === team.id)
    ),
    [allTeamsCatalog, teams]
  );
  const managedPlayers = useMemo(
    () => managedTeam?.players ?? [],
    [managedTeam]
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

    async function loadContext() {
      setIsLoadingContext(true);

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
          setIsLoadingContext(false);
        }
      }
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingContext || leagues.length === 0) {
      return;
    }

    const hasSelectedLeague = leagues.some(
      (league) => String(league.id) === selectedLeagueId
    );

    if (!hasSelectedLeague) {
      updateSelection(leagues[0].id, null);
    }
  }, [isLoadingContext, leagues, selectedLeagueId, updateSelection]);

  useEffect(() => {
    if (!selectedLeagueId) {
      setSeasons([]);
      setTeams([]);
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

  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      setTeams([]);
      setManagedTeamId('');
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

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        const teamsData = await getTeams({ includePlayers: false });
        if (!isMounted) {
          return;
        }
        setAllTeamsCatalog(teamsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage('No se pudo cargar el catálogo general de equipos.');
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId, selectedSeasonId]);

  useEffect(() => {
    if (sortedTeams.length === 0) {
      setManagedTeamId('');
      setManagedTeam(null);
      return;
    }

    if (!sortedTeams.some((team) => String(team.id) === managedTeamId)) {
      setManagedTeamId(String(sortedTeams[0].id));
    }
  }, [managedTeamId, sortedTeams]);

  useEffect(() => {
    if (!managedTeamId || !selectedLeagueId || !selectedSeasonId) {
      setManagedTeam(null);
      return;
    }

    let isMounted = true;

    async function loadManagedTeam() {
      setIsLoadingManagedTeam(true);

      try {
        const teamData = await getTeam(managedTeamId, {
          leagueId: selectedLeagueId,
          seasonId: selectedSeasonId,
          includePlayers: true,
        });
        if (!isMounted) {
          return;
        }
        setManagedTeam(teamData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setManagedTeam(null);
        setErrorMessage('No se pudo cargar la plantilla del equipo.');
      } finally {
        if (isMounted) {
          setIsLoadingManagedTeam(false);
        }
      }
    }

    loadManagedTeam();

    return () => {
      isMounted = false;
    };
  }, [managedTeamId, selectedLeagueId, selectedSeasonId]);

  useEffect(() => {
    if (!managedTeam) {
      setPlayerDrafts({});
      setTransferTargets({});
      return;
    }

    setPlayerDrafts(
      managedPlayers.reduce((drafts, player) => {
        drafts[player.player_id] = {
          average: player.average ?? '',
          captain: String(player.captain ?? 0),
        };
        return drafts;
      }, {})
    );
    setTransferTargets(
      managedPlayers.reduce((targets, player) => {
        targets[player.player_id] = '';
        return targets;
      }, {})
    );
  }, [managedPlayers, managedTeam]);

  const refreshTeamsAndManagedTeam = async (nextManagedTeamId = managedTeamId) => {
    const teamsData = await getTeams({
      leagueId: selectedLeagueId,
      seasonId: selectedSeasonId,
      includePlayers: false,
    });
    setTeams(teamsData);

    const catalogData = await getTeams({ includePlayers: false });
    setAllTeamsCatalog(catalogData);

    if (nextManagedTeamId) {
      const teamData = await getTeam(nextManagedTeamId, {
        leagueId: selectedLeagueId,
        seasonId: selectedSeasonId,
        includePlayers: true,
      });
      setManagedTeam(teamData);
    }
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const createdTeam = await createTeam({
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        name: teamForm.name,
        logo: teamForm.logo,
        field: teamForm.field,
        field_element: teamForm.fieldElement,
      });
      setTeamForm(getInitialTeamForm());
      setManagedTeamId(String(createdTeam.id));
      await refreshTeamsAndManagedTeam(String(createdTeam.id));
      setSuccessMessage('Equipo creado correctamente.');
    } catch (error) {
      setErrorMessage('No se pudo crear el equipo.');
    }
  };

  const handleAddExistingTeam = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await addExistingTeamToSeason(existingTeamId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
      });
      setManagedTeamId(String(existingTeamId));
      setExistingTeamId('');
      await refreshTeamsAndManagedTeam(String(existingTeamId));
      setSuccessMessage('Equipo añadido a la temporada.');
    } catch (error) {
      setErrorMessage('No se pudo añadir el equipo existente.');
    }
  };

  const handleDeleteManagedTeam = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteTeamFromSeason(managedTeamId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
      });
      setManagedTeamId('');
      setManagedTeam(null);
      await refreshTeamsAndManagedTeam('');
      setSuccessMessage('Equipo eliminado de esta temporada.');
    } catch (error) {
      setErrorMessage('No se pudo eliminar el equipo de la temporada.');
    }
  };

  const handleCreatePlayer = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createTeamPlayer(managedTeamId, {
        team_id: Number(managedTeamId),
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        player_id: Number(playerForm.playerId),
        average: playerForm.average === '' ? null : Number(playerForm.average),
        captain: Number(playerForm.captain),
      });
      setPlayerForm(getInitialPlayerForm());
      await refreshTeamsAndManagedTeam(managedTeamId);
      setSuccessMessage('Jugador añadido correctamente.');
    } catch (error) {
      setErrorMessage('No se pudo añadir el jugador.');
    }
  };

  const handlePlayerDraftChange = (playerId, field, value) => {
    setPlayerDrafts((currentDrafts) => ({
      ...currentDrafts,
      [playerId]: {
        ...currentDrafts[playerId],
        [field]: value,
      },
    }));
  };

  const handleTransferTargetChange = (playerId, value) => {
    setTransferTargets((currentTargets) => ({
      ...currentTargets,
      [playerId]: value,
    }));
  };

  const handleUpdatePlayer = async (playerId) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const draft = playerDrafts[playerId];
      await updateTeamPlayer(managedTeamId, playerId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        average: draft.average === '' ? null : Number(draft.average),
        captain: Number(draft.captain),
      });
      await refreshTeamsAndManagedTeam(managedTeamId);
      setSuccessMessage('Jugador actualizado.');
    } catch (error) {
      setErrorMessage('No se pudieron guardar los cambios del jugador.');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteTeamPlayer(managedTeamId, playerId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
      });
      await refreshTeamsAndManagedTeam(managedTeamId);
      setSuccessMessage('Jugador eliminado del equipo.');
    } catch (error) {
      setErrorMessage('No se pudo eliminar el jugador.');
    }
  };

  const handleMovePlayer = async (playerId) => {
    const targetTeamId = transferTargets[playerId];
    if (!targetTeamId) {
      setErrorMessage('Selecciona primero un equipo de destino.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await moveTeamPlayer({
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        player_id: Number(playerId),
        from_team_id: Number(managedTeamId),
        to_team_id: Number(targetTeamId),
        keep_player_data: true,
      });
      await refreshTeamsAndManagedTeam(managedTeamId);
      setSuccessMessage('Jugador movido correctamente.');
    } catch (error) {
      setErrorMessage('No se pudo mover el jugador.');
    }
  };

  return (
    <section className="page-section management-page">
      <div className="management-toolbar">
        <Link className="back-link" to={`/${selectionSuffix}`}>
          Volver al inicio
        </Link>
        <div className="management-toolbar__spacer" />
        <Link
          className="management-link-button"
          to={`/management/competitions${selectionSuffix}`}
        >
          Ir a gestión de competiciones
        </Link>
      </div>

      <header className="page-header">
        <p className="page-eyebrow">Gestión</p>
        <h1 className="page-title">Equipos y plantillas</h1>
        <p className="page-description">
          Todo lo que hagas aquí trabaja sobre la liga y temporada activas que
          tienes cargadas.
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
          <h2 className="management-context__title">Contexto de trabajo</h2>
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

      {!selectedLeagueId || !selectedSeasonId ? (
        <div className="panel panel-empty">
          Necesitas tener una liga y una temporada activas para gestionar equipos.
        </div>
      ) : (
        <>
          <section className="management-grid">
            <article className="panel management-card">
              <h2 className="management-card__title">Crear equipo</h2>
              <form className="management-form" onSubmit={handleCreateTeam}>
                <label className="management-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(event) =>
                      setTeamForm((currentForm) => ({
                        ...currentForm,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="management-field">
                  <span>Logo</span>
                  <input
                    type="text"
                    value={teamForm.logo}
                    onChange={(event) =>
                      setTeamForm((currentForm) => ({
                        ...currentForm,
                        logo: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="management-field">
                  <span>Campo</span>
                  <input
                    type="text"
                    value={teamForm.field}
                    onChange={(event) =>
                      setTeamForm((currentForm) => ({
                        ...currentForm,
                        field: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="management-field">
                  <span>Elemento del campo</span>
                  <select
                    value={teamForm.fieldElement}
                    onChange={(event) =>
                      setTeamForm((currentForm) => ({
                        ...currentForm,
                        fieldElement: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sin definir</option>
                    <option value="FUE">Fuego</option>
                    <option value="BOS">Bosque</option>
                    <option value="MON">Montaña</option>
                    <option value="AIR">Aire</option>
                  </select>
                </label>
                <button className="management-primary-button" type="submit">
                  Crear equipo en esta temporada
                </button>
              </form>
            </article>

            <article className="panel management-card">
              <h2 className="management-card__title">Añadir equipo existente</h2>
              <form className="management-form" onSubmit={handleAddExistingTeam}>
                <label className="management-field">
                  <span>Equipo disponible</span>
                  <select
                    value={existingTeamId}
                    onChange={(event) => setExistingTeamId(event.target.value)}
                  >
                    <option value="">Selecciona un equipo</option>
                    {availableExistingTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {getTeamDisplayName(team)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="management-primary-button"
                  type="submit"
                  disabled={!existingTeamId}
                >
                  Añadir a esta temporada
                </button>
              </form>
            </article>
          </section>

          <section className="management-grid management-grid--single">
            <article className="panel management-card">
              <h2 className="management-card__title">Equipo en gestión</h2>
              <div className="management-context__fields">
                <label className="management-field">
                  <span>Equipo</span>
                  <select
                    value={managedTeamId}
                    onChange={(event) => setManagedTeamId(event.target.value)}
                    disabled={isLoadingTeams || sortedTeams.length === 0}
                  >
                    {sortedTeams.length === 0 ? (
                      <option value="">Sin equipos</option>
                    ) : (
                      sortedTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {getTeamDisplayName(team)}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <div className="management-toolbar">
                  <button
                    className="management-danger-button"
                    type="button"
                    disabled={!managedTeamId}
                    onClick={handleDeleteManagedTeam}
                  >
                    Borrar equipo de esta temporada
                  </button>
                </div>
              </div>
            </article>

            <article className="panel management-card">
              <h2 className="management-card__title">Plantilla</h2>
              {isLoadingManagedTeam ? (
                <div className="panel-empty">Cargando plantilla...</div>
              ) : !managedTeamId ? (
                <div className="panel-empty">No hay equipo seleccionado.</div>
              ) : (
                <>
                  <form className="management-form" onSubmit={handleCreatePlayer}>
                    <div className="management-form__row">
                      <label className="management-field">
                        <span>ID jugador</span>
                        <input
                          type="number"
                          value={playerForm.playerId}
                          onChange={(event) =>
                            setPlayerForm((currentForm) => ({
                              ...currentForm,
                              playerId: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="management-field">
                        <span>Media</span>
                        <input
                          type="number"
                          value={playerForm.average}
                          onChange={(event) =>
                            setPlayerForm((currentForm) => ({
                              ...currentForm,
                              average: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="management-field">
                        <span>Capitanía</span>
                        <select
                          value={playerForm.captain}
                          onChange={(event) =>
                            setPlayerForm((currentForm) => ({
                              ...currentForm,
                              captain: event.target.value,
                            }))
                          }
                        >
                          <option value="0">Sin rango</option>
                          <option value="1">Capitán</option>
                          <option value="2">Co-capitán</option>
                        </select>
                      </label>
                    </div>
                    <button className="management-primary-button" type="submit">
                      Añadir jugador al equipo
                    </button>
                  </form>

                  <div className="management-roster">
                    <div className="management-roster__header">
                      <span>Jugador</span>
                      <span>Media</span>
                      <span>Capitanía</span>
                      <span>Mover a</span>
                      <span>Acciones</span>
                    </div>

                    {managedPlayers.map((player) => {
                      const draft = playerDrafts[player.player_id] || {
                        average: player.average ?? '',
                        captain: String(player.captain ?? 0),
                      };

                      return (
                        <div className="management-roster__row" key={player.player_id}>
                          <div className="management-roster__player">
                            <strong>{player.name}</strong>
                            <span>ID {player.player_id}</span>
                          </div>

                          <input
                            type="number"
                            value={draft.average}
                            onChange={(event) =>
                              handlePlayerDraftChange(
                                player.player_id,
                                'average',
                                event.target.value
                              )
                            }
                          />

                          <select
                            value={draft.captain}
                            onChange={(event) =>
                              handlePlayerDraftChange(
                                player.player_id,
                                'captain',
                                event.target.value
                              )
                            }
                          >
                            <option value="0">Sin rango</option>
                            <option value="1">Capitán</option>
                            <option value="2">Co-capitán</option>
                          </select>

                          <select
                            value={transferTargets[player.player_id] || ''}
                            onChange={(event) =>
                              handleTransferTargetChange(player.player_id, event.target.value)
                            }
                          >
                            <option value="">Sin mover</option>
                            {sortedTeams
                              .filter((team) => String(team.id) !== managedTeamId)
                              .map((team) => (
                                <option key={team.id} value={team.id}>
                                  {getTeamDisplayName(team)}
                                </option>
                              ))}
                          </select>

                          <div className="management-actions">
                            <button
                              className="management-secondary-button"
                              type="button"
                              onClick={() => handleUpdatePlayer(player.player_id)}
                            >
                              Guardar
                            </button>
                            <button
                              className="management-primary-button"
                              type="button"
                              onClick={() => handleMovePlayer(player.player_id)}
                            >
                              Pasar
                            </button>
                            <button
                              className="management-danger-button"
                              type="button"
                              onClick={() => handleDeletePlayer(player.player_id)}
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      )}
    </section>
  );
}

export default TeamManagementPage;

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompetitionSelection } from '../../hooks/useCompetitionSelection';
import {
  createLeague,
  createSeason,
  createTeam,
  createTeamPlayer,
  createTransfer,
  deleteLeague,
  deleteSeason,
  deleteTeamFromSeason,
  deleteTeamPlayer,
  getLeagues,
  getSeasons,
  getTeam,
  getTeams,
  getTransfers,
  updateLeague,
  updateSeason,
  updateTeamPlayer,
} from '../../services/frontierApi';
import './ManagementPages.css';

function getTeamDisplayName(team) {
  return team.name && team.name.trim() ? team.name : `Equipo ${team.id}`;
}

function getInitialSeasonForm() {
  return {
    leagueId: '',
    name: '',
    sourceSeasonId: '',
    copyTeams: false,
    copyPlayers: false,
    copyPlayerData: false,
  };
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

function ManagementPage() {
  const { leagueId: selectedLeagueId, seasonId: selectedSeasonId, updateSelection } =
    useCompetitionSelection();
  const [activeSection, setActiveSection] = useState('administration');
  const [leagues, setLeagues] = useState([]);
  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedLeagueSeasons, setSelectedLeagueSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managedTeamId, setManagedTeamId] = useState('');
  const [managedTeam, setManagedTeam] = useState(null);
  const [sourceTeamId, setSourceTeamId] = useState('');
  const [sourceTeam, setSourceTeam] = useState(null);
  const [transferPlayerId, setTransferPlayerId] = useState('');
  const [destinationTeamId, setDestinationTeamId] = useState('');
  const [transferType, setTransferType] = useState('fichaje');
  const [transactions, setTransactions] = useState([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [isLoadingAdminSeasons, setIsLoadingAdminSeasons] = useState(true);
  const [isLoadingSelectedLeagueSeasons, setIsLoadingSelectedLeagueSeasons] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingManagedTeam, setIsLoadingManagedTeam] = useState(false);
  const [isLoadingSourceTeam, setIsLoadingSourceTeam] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [seasonForm, setSeasonForm] = useState(getInitialSeasonForm());
  const [editingLeagueId, setEditingLeagueId] = useState('');
  const [editingLeagueName, setEditingLeagueName] = useState('');
  const [editingSeasonId, setEditingSeasonId] = useState('');
  const [editingSeasonName, setEditingSeasonName] = useState('');
  const [editingSeasonLeagueId, setEditingSeasonLeagueId] = useState('');
  const [teamForm, setTeamForm] = useState(getInitialTeamForm());
  const [playerForm, setPlayerForm] = useState(getInitialPlayerForm());
  const [playerDrafts, setPlayerDrafts] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedLeague = useMemo(
    () => leagues.find((league) => String(league.id) === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );
  const selectedSeason = useMemo(
    () => selectedLeagueSeasons.find((season) => String(season.id) === selectedSeasonId) ?? null,
    [selectedLeagueSeasons, selectedSeasonId]
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((firstTeam, secondTeam) =>
      getTeamDisplayName(firstTeam).localeCompare(getTeamDisplayName(secondTeam))
    ),
    [teams]
  );
  const sourceTeamPlayers = useMemo(
    () => sourceTeam?.players?.filter((player) => player.is_coach === false) ?? [],
    [sourceTeam]
  );
  const managedPlayers = useMemo(
    () => managedTeam?.players ?? [],
    [managedTeam]
  );
  const seasonsForSeasonForm = useMemo(
    () =>
      allSeasons.filter(
        (season) =>
          String(season.id_league) === String(seasonForm.leagueId) &&
          String(season.id) !== editingSeasonId
      ),
    [allSeasons, editingSeasonId, seasonForm.leagueId]
  );
  const leagueNamesById = useMemo(
    () =>
      leagues.reduce((accumulator, league) => {
        accumulator[league.id] = league.name;
        return accumulator;
      }, {}),
    [leagues]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      setIsLoadingLeagues(true);
      setIsLoadingAdminSeasons(true);

      try {
        const [leaguesData, seasonsData] = await Promise.all([
          getLeagues(),
          getSeasons(),
        ]);

        if (!isMounted) {
          return;
        }

        setLeagues(leaguesData);
        setAllSeasons(seasonsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage('No se pudieron cargar los datos de administración.');
      } finally {
        if (isMounted) {
          setIsLoadingLeagues(false);
          setIsLoadingAdminSeasons(false);
        }
      }
    }

    loadAdminData();

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
      updateSelection(leagues[0].id, '');
    }
  }, [isLoadingLeagues, leagues, selectedLeagueId, updateSelection]);

  useEffect(() => {
    if (!selectedLeagueId) {
      setSelectedLeagueSeasons([]);
      setTeams([]);
      return;
    }

    let isMounted = true;

    async function loadSelectedLeagueSeasons() {
      setIsLoadingSelectedLeagueSeasons(true);

      try {
        const seasonsData = await getSeasons(selectedLeagueId);
        if (!isMounted) {
          return;
        }
        setSelectedLeagueSeasons(seasonsData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSelectedLeagueSeasons([]);
        setErrorMessage('No se pudieron cargar las temporadas de la liga activa.');
      } finally {
        if (isMounted) {
          setIsLoadingSelectedLeagueSeasons(false);
        }
      }
    }

    loadSelectedLeagueSeasons();

    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId]);

  useEffect(() => {
    if (!selectedLeagueId || isLoadingSelectedLeagueSeasons) {
      return;
    }

    if (selectedLeagueSeasons.length === 0) {
      if (selectedSeasonId) {
        updateSelection(selectedLeagueId, '');
      }
      return;
    }

    const hasSelectedSeason = selectedLeagueSeasons.some(
      (season) => String(season.id) === selectedSeasonId
    );

    if (!hasSelectedSeason) {
      updateSelection(selectedLeagueId, selectedLeagueSeasons[0].id);
    }
  }, [
    isLoadingSelectedLeagueSeasons,
    selectedLeagueId,
    selectedLeagueSeasons,
    selectedSeasonId,
    updateSelection,
  ]);

  useEffect(() => {
    if (!selectedLeagueId || !selectedSeasonId) {
      setTeams([]);
      setManagedTeamId('');
      setSourceTeamId('');
      setTransactions([]);
      return;
    }

    let isMounted = true;

    async function loadLeagueTeamsAndTransfers() {
      setIsLoadingTeams(true);
      setIsLoadingTransactions(true);

      try {
        const [teamsData, transfersData] = await Promise.all([
          getTeams({
            leagueId: selectedLeagueId,
            seasonId: selectedSeasonId,
            includePlayers: false,
          }),
          getTransfers({
            leagueId: selectedLeagueId,
            seasonId: selectedSeasonId,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setTeams(teamsData);
        setTransactions(transfersData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTeams([]);
        setTransactions([]);
        setErrorMessage('No se pudieron cargar los equipos o los traspasos.');
      } finally {
        if (isMounted) {
          setIsLoadingTeams(false);
          setIsLoadingTransactions(false);
        }
      }
    }

    loadLeagueTeamsAndTransfers();

    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId, selectedSeasonId]);

  useEffect(() => {
    if (sortedTeams.length === 0) {
      setManagedTeamId('');
      setSourceTeamId('');
      return;
    }

    if (!sortedTeams.some((team) => String(team.id) === managedTeamId)) {
      setManagedTeamId(String(sortedTeams[0].id));
    }

    if (!sortedTeams.some((team) => String(team.id) === sourceTeamId)) {
      setSourceTeamId(String(sortedTeams[0].id));
    }
  }, [managedTeamId, sourceTeamId, sortedTeams]);

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
    if (!sourceTeamId || !selectedLeagueId || !selectedSeasonId) {
      setSourceTeam(null);
      setTransferPlayerId('');
      setDestinationTeamId('');
      return;
    }

    let isMounted = true;

    async function loadSourceTeam() {
      setIsLoadingSourceTeam(true);

      try {
        const teamData = await getTeam(sourceTeamId, {
          leagueId: selectedLeagueId,
          seasonId: selectedSeasonId,
          includePlayers: true,
        });
        if (!isMounted) {
          return;
        }
        setSourceTeam(teamData);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSourceTeam(null);
        setErrorMessage('No se pudo cargar el equipo origen.');
      } finally {
        if (isMounted) {
          setIsLoadingSourceTeam(false);
        }
      }
    }

    loadSourceTeam();

    return () => {
      isMounted = false;
    };
  }, [sourceTeamId, selectedLeagueId, selectedSeasonId]);

  useEffect(() => {
    if (sourceTeamPlayers.length === 0) {
      setTransferPlayerId('');
      return;
    }

    if (!sourceTeamPlayers.some((player) => String(player.player_id) === transferPlayerId)) {
      setTransferPlayerId(String(sourceTeamPlayers[0].player_id));
    }
  }, [sourceTeamPlayers, transferPlayerId]);

  useEffect(() => {
    const availableDestinationTeams = sortedTeams.filter(
      (team) => String(team.id) !== sourceTeamId
    );

    if (availableDestinationTeams.length === 0) {
      setDestinationTeamId('');
      return;
    }

    if (!availableDestinationTeams.some((team) => String(team.id) === destinationTeamId)) {
      setDestinationTeamId(String(availableDestinationTeams[0].id));
    }
  }, [destinationTeamId, sourceTeamId, sortedTeams]);

  useEffect(() => {
    if (!managedTeam) {
      setPlayerDrafts({});
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
  }, [managedPlayers, managedTeam]);

  const refreshAdminData = async () => {
    const [leaguesData, seasonsData] = await Promise.all([
      getLeagues(),
      getSeasons(),
    ]);
    setLeagues(leaguesData);
    setAllSeasons(seasonsData);
  };

  const refreshLeagueContextData = async ({
    nextManagedTeamId = managedTeamId,
    nextSourceTeamId = sourceTeamId,
  } = {}) => {
    const [teamsData, transfersData] = await Promise.all([
      getTeams({
        leagueId: selectedLeagueId,
        seasonId: selectedSeasonId,
        includePlayers: false,
      }),
      getTransfers({
        leagueId: selectedLeagueId,
        seasonId: selectedSeasonId,
      }),
    ]);
    setTeams(teamsData);
    setTransactions(transfersData);

    if (selectedLeagueId) {
      const seasonsData = await getSeasons(selectedLeagueId);
      setSelectedLeagueSeasons(seasonsData);
    }

    if (nextManagedTeamId) {
      const managedData = await getTeam(nextManagedTeamId, {
        leagueId: selectedLeagueId,
        seasonId: selectedSeasonId,
        includePlayers: true,
      });
      setManagedTeam(managedData);
    } else {
      setManagedTeam(null);
    }

    if (nextSourceTeamId) {
      const sourceData = await getTeam(nextSourceTeamId, {
        leagueId: selectedLeagueId,
        seasonId: selectedSeasonId,
        includePlayers: true,
      });
      setSourceTeam(sourceData);
    } else {
      setSourceTeam(null);
    }
  };

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCreateLeague = async (event) => {
    event.preventDefault();
    resetMessages();

    try {
      await createLeague({ name: leagueName });
      setLeagueName('');
      await refreshAdminData();
      setSuccessMessage('Liga creada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo crear la liga.');
    }
  };

  const handleSaveLeague = async (leagueId) => {
    resetMessages();

    try {
      await updateLeague(leagueId, { name: editingLeagueName });
      setEditingLeagueId('');
      setEditingLeagueName('');
      await refreshAdminData();
      setSuccessMessage('Liga actualizada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar la liga.');
    }
  };

  const handleDeleteLeague = async (league) => {
    const confirmed = window.confirm(
      `Vas a borrar la liga "${league.name}" con todas sus temporadas, equipos y plantillas.`
    );

    if (!confirmed) {
      return;
    }

    resetMessages();

    try {
      await deleteLeague(league.id);
      await refreshAdminData();
      if (String(league.id) === selectedLeagueId) {
        updateSelection('', '');
      }
      setSuccessMessage('Liga eliminada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la liga.');
    }
  };

  const handleCreateSeason = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!seasonForm.leagueId) {
      setErrorMessage('Selecciona una liga para crear la temporada.');
      return;
    }

    if (seasonForm.copyTeams && !seasonForm.sourceSeasonId) {
      setErrorMessage('Selecciona una temporada origen antes de copiar equipos o plantillas.');
      return;
    }

    try {
      await createSeason({
        league_id: Number(seasonForm.leagueId),
        name: seasonForm.name,
        source_season_id: seasonForm.sourceSeasonId
          ? Number(seasonForm.sourceSeasonId)
          : null,
        copy_teams: seasonForm.copyTeams,
        copy_players: seasonForm.copyTeams && seasonForm.copyPlayers,
        copy_player_data:
          seasonForm.copyTeams && seasonForm.copyPlayers && seasonForm.copyPlayerData,
      });
      setSeasonForm(getInitialSeasonForm());
      await refreshAdminData();
      if (String(selectedLeagueId) === String(seasonForm.leagueId)) {
        const seasonsData = await getSeasons(selectedLeagueId);
        setSelectedLeagueSeasons(seasonsData);
      }
      setSuccessMessage('Temporada creada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo crear la temporada.');
    }
  };

  const handleSaveSeason = async (seasonId) => {
    resetMessages();

    try {
      await updateSeason(seasonId, {
        league_id: Number(editingSeasonLeagueId),
        name: editingSeasonName,
      });
      setEditingSeasonId('');
      setEditingSeasonName('');
      setEditingSeasonLeagueId('');
      await refreshAdminData();
      if (selectedLeagueId) {
        const seasonsData = await getSeasons(selectedLeagueId);
        setSelectedLeagueSeasons(seasonsData);
      }
      setSuccessMessage('Temporada actualizada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar la temporada.');
    }
  };

  const handleDeleteSeason = async (season) => {
    const confirmed = window.confirm(
      `Vas a borrar la temporada "${season.name}" y todas sus plantillas asociadas.`
    );

    if (!confirmed) {
      return;
    }

    resetMessages();

    try {
      await deleteSeason(season.id, season.id_league);
      await refreshAdminData();
      if (String(selectedLeagueId) === String(season.id_league)) {
        const seasonsData = await getSeasons(selectedLeagueId);
        setSelectedLeagueSeasons(seasonsData);
        if (String(selectedSeasonId) === String(season.id)) {
          updateSelection(selectedLeagueId, seasonsData[0]?.id || '');
        }
      }
      setSuccessMessage('Temporada eliminada correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la temporada.');
    }
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    resetMessages();

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
      setSourceTeamId(String(createdTeam.id));
      await refreshLeagueContextData({
        nextManagedTeamId: String(createdTeam.id),
        nextSourceTeamId: String(createdTeam.id),
      });
      setSuccessMessage('Equipo creado correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo crear el equipo.');
    }
  };

  const handleDeleteManagedTeam = async () => {
    resetMessages();

    try {
      await deleteTeamFromSeason(managedTeamId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
      });
      setManagedTeamId('');
      await refreshLeagueContextData({
        nextManagedTeamId: '',
        nextSourceTeamId: sourceTeamId === managedTeamId ? '' : sourceTeamId,
      });
      setSuccessMessage('Equipo eliminado de la liga/temporada activa.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el equipo.');
    }
  };

  const handleCreatePlayer = async (event) => {
    event.preventDefault();
    resetMessages();

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
      await refreshLeagueContextData();
      setSuccessMessage('Jugador añadido correctamente. No se permiten duplicados entre equipos.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo añadir el jugador.');
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

  const handleSavePlayer = async (playerId) => {
    resetMessages();
    const draft = playerDrafts[playerId];

    try {
      await updateTeamPlayer(managedTeamId, playerId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        average: draft.average === '' ? null : Number(draft.average),
        captain: Number(draft.captain),
      });
      await refreshLeagueContextData();
      setSuccessMessage('Jugador actualizado correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar el jugador.');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    resetMessages();

    try {
      await deleteTeamPlayer(managedTeamId, playerId, {
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
      });
      await refreshLeagueContextData();
      setSuccessMessage('Jugador eliminado del equipo.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el jugador.');
    }
  };

  const handleCreateTransfer = async (event) => {
    event.preventDefault();
    resetMessages();

    try {
      await createTransfer({
        league_id: Number(selectedLeagueId),
        season_id: Number(selectedSeasonId),
        player_id: Number(transferPlayerId),
        from_team_id: Number(sourceTeamId),
        to_team_id: Number(destinationTeamId),
        transaction_type: transferType,
        keep_player_data: true,
      });
      await refreshLeagueContextData({
        nextManagedTeamId: managedTeamId,
        nextSourceTeamId: sourceTeamId,
      });
      setSuccessMessage('Traspaso registrado correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo registrar el traspaso.');
    }
  };

  const selectionQuery = new URLSearchParams();
  if (selectedLeagueId) {
    selectionQuery.set('leagueId', selectedLeagueId);
  }
  if (selectedSeasonId) {
    selectionQuery.set('seasonId', selectedSeasonId);
  }
  const selectionSuffix = selectionQuery.toString() ? `?${selectionQuery.toString()}` : '';

  return (
    <section className="page-section management-page">
      <div className="management-toolbar">
        <Link className="back-link" to={`/${selectionSuffix}`}>
          Volver al inicio
        </Link>
      </div>

      <header className="page-header">
        <p className="page-eyebrow">Gestión</p>
        <h1 className="page-title">Gestión</h1>
        <p className="page-description">
          Todo lo operativo del proyecto queda centralizado aquí, separado por
          apartados para que tenga sentido a nivel interno.
        </p>
      </header>

      {errorMessage ? <div className="panel panel-empty">{errorMessage}</div> : null}
      {successMessage ? (
        <div className="panel panel-empty management-feedback--success">
          {successMessage}
        </div>
      ) : null}

      <section className="panel management-tabs">
        <button
          type="button"
          className={
            activeSection === 'administration'
              ? 'management-tab management-tab--active'
              : 'management-tab'
          }
          onClick={() => setActiveSection('administration')}
        >
          Administración
        </button>
        <button
          type="button"
          className={
            activeSection === 'league'
              ? 'management-tab management-tab--active'
              : 'management-tab'
          }
          onClick={() => setActiveSection('league')}
        >
          Gestionar liga
        </button>
        <button
          type="button"
          className={
            activeSection === 'transfers'
              ? 'management-tab management-tab--active'
              : 'management-tab'
          }
          onClick={() => setActiveSection('transfers')}
        >
          Gestionar equipos
        </button>
      </section>

      {activeSection === 'administration' ? (
        <>
          <section className="management-grid">
            <article className="panel management-card">
              <h2 className="management-card__title">CRUD de ligas</h2>
              <p className="management-card__subtitle">
                Este apartado es puramente administrativo y no precarga ninguna liga.
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
              <h2 className="management-card__title">CRUD de temporadas</h2>
              <p className="management-card__subtitle">
                La temporada siempre se crea asociada a la liga que elijas.
              </p>
              <form className="management-form" onSubmit={handleCreateSeason}>
                <label className="management-field">
                  <span>Liga asociada</span>
                  <select
                    value={seasonForm.leagueId}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        leagueId: event.target.value,
                        sourceSeasonId: '',
                      }))
                    }
                  >
                    <option value="">Selecciona una liga</option>
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
                    value={seasonForm.name}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ej. Temporada 2"
                  />
                </label>
                <label className="management-field">
                  <span>Temporada origen</span>
                  <select
                    value={seasonForm.sourceSeasonId}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        sourceSeasonId: event.target.value,
                      }))
                    }
                    disabled={!seasonForm.leagueId || seasonsForSeasonForm.length === 0}
                  >
                    <option value="">Sin copia</option>
                    {seasonsForSeasonForm.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="management-check">
                  <input
                    type="checkbox"
                    checked={seasonForm.copyTeams}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        copyTeams: event.target.checked,
                        copyPlayers: event.target.checked ? currentForm.copyPlayers : false,
                        copyPlayerData: event.target.checked ? currentForm.copyPlayerData : false,
                      }))
                    }
                  />
                  <span>Copiar equipos</span>
                </label>
                <label className="management-check">
                  <input
                    type="checkbox"
                    checked={seasonForm.copyPlayers}
                    disabled={!seasonForm.copyTeams}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        copyPlayers: event.target.checked,
                        copyPlayerData: event.target.checked
                          ? currentForm.copyPlayerData
                          : false,
                      }))
                    }
                  />
                  <span>Copiar jugadores</span>
                </label>
                <label className="management-check">
                  <input
                    type="checkbox"
                    checked={seasonForm.copyPlayerData}
                    disabled={!seasonForm.copyTeams || !seasonForm.copyPlayers}
                    onChange={(event) =>
                      setSeasonForm((currentForm) => ({
                        ...currentForm,
                        copyPlayerData: event.target.checked,
                      }))
                    }
                  />
                  <span>Copiar datos de jugadores</span>
                </label>
                <button className="management-primary-button" type="submit">
                  Crear temporada
                </button>
              </form>
            </article>
          </section>

          <section className="management-grid">
            <article className="panel management-card">
              <h2 className="management-card__title">Ligas</h2>
              {isLoadingLeagues ? (
                <div className="panel-empty">Cargando ligas...</div>
              ) : (
                <div className="management-list">
                  {leagues.map((league) => (
                    <div key={league.id} className="panel management-list__item">
                      {editingLeagueId === String(league.id) ? (
                        <div className="management-inline-edit">
                          <input
                            type="text"
                            value={editingLeagueName}
                            onChange={(event) => setEditingLeagueName(event.target.value)}
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="management-list__title">{league.name}</p>
                        </div>
                      )}
                      <div className="management-list__meta">
                        <span className="meta-pill">Liga #{league.id}</span>
                        {editingLeagueId === String(league.id) ? (
                          <>
                            <button
                              type="button"
                              className="management-primary-button"
                              onClick={() => handleSaveLeague(league.id)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="management-secondary-button"
                              onClick={() => {
                                setEditingLeagueId('');
                                setEditingLeagueName('');
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="management-secondary-button"
                              onClick={() => {
                                setEditingLeagueId(String(league.id));
                                setEditingLeagueName(league.name);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="management-danger-button"
                              onClick={() => handleDeleteLeague(league)}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel management-card">
              <h2 className="management-card__title">Temporadas</h2>
              {isLoadingAdminSeasons ? (
                <div className="panel-empty">Cargando temporadas...</div>
              ) : (
                <div className="management-list">
                  {allSeasons.map((season) => (
                    <div key={season.id} className="panel management-list__item">
                      {editingSeasonId === String(season.id) ? (
                        <div className="management-inline-edit">
                          <input
                            type="text"
                            value={editingSeasonName}
                            onChange={(event) => setEditingSeasonName(event.target.value)}
                          />
                          <select
                            value={editingSeasonLeagueId}
                            onChange={(event) => setEditingSeasonLeagueId(event.target.value)}
                          >
                            {leagues.map((league) => (
                              <option key={league.id} value={league.id}>
                                {league.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <p className="management-list__title">{season.name}</p>
                          <span className="meta-pill">
                            {leagueNamesById[season.id_league] || `Liga ${season.id_league}`}
                          </span>
                        </div>
                      )}
                      <div className="management-list__meta">
                        <span className="meta-pill">Temporada #{season.id}</span>
                        {editingSeasonId === String(season.id) ? (
                          <>
                            <button
                              type="button"
                              className="management-primary-button"
                              onClick={() => handleSaveSeason(season.id)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="management-secondary-button"
                              onClick={() => {
                                setEditingSeasonId('');
                                setEditingSeasonName('');
                                setEditingSeasonLeagueId('');
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="management-secondary-button"
                              onClick={() => {
                                setEditingSeasonId(String(season.id));
                                setEditingSeasonName(season.name);
                                setEditingSeasonLeagueId(String(season.id_league));
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="management-danger-button"
                              onClick={() => handleDeleteSeason(season)}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}

      {activeSection === 'league' ? (
        <>
          <section className="panel management-context">
            <div className="management-context__header">
              <h2 className="management-context__title">Contexto de liga</h2>
              {selectedLeague ? <span className="meta-pill">Liga: {selectedLeague.name}</span> : null}
              {selectedSeason ? <span className="meta-pill">Temporada: {selectedSeason.name}</span> : null}
            </div>

            <div className="management-context__fields">
              <label className="management-field">
                <span>Liga activa</span>
                <select
                  value={selectedLeagueId}
                  onChange={(event) => updateSelection(event.target.value, '')}
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
                  disabled={!selectedLeagueId || selectedLeagueSeasons.length === 0}
                >
                  {selectedLeagueSeasons.length === 0 ? (
                    <option value="">Sin temporadas</option>
                  ) : (
                    selectedLeagueSeasons.map((season) => (
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
              Selecciona una liga y una temporada para gestionar sus equipos.
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
                      Crear equipo
                    </button>
                  </form>
                </article>

                <article className="panel management-card">
                  <h2 className="management-card__title">Equipo a gestionar</h2>
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
                  <button
                    className="management-danger-button"
                    type="button"
                    disabled={!managedTeamId}
                    onClick={handleDeleteManagedTeam}
                  >
                    Borrar equipo de esta liga/temporada
                  </button>
                </article>
              </section>

              <section className="management-grid management-grid--single">
                <article className="panel management-card">
                  <h2 className="management-card__title">Plantilla del equipo</h2>
                  {isLoadingManagedTeam ? (
                    <div className="panel-empty">Cargando plantilla...</div>
                  ) : !managedTeamId ? (
                    <div className="panel-empty">Selecciona un equipo.</div>
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
                          Añadir jugador
                        </button>
                      </form>

                      <div className="management-roster">
                        <div className="management-roster__header">
                          <span>Jugador</span>
                          <span>Media</span>
                          <span>Capitanía</span>
                          <span>Estado</span>
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

                              <span className="meta-pill">
                                {player.is_coach ? 'Entrenador' : 'Jugador'}
                              </span>

                              <div className="management-actions">
                                <button
                                  type="button"
                                  className="management-secondary-button"
                                  onClick={() => handleSavePlayer(player.player_id)}
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  className="management-danger-button"
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
        </>
      ) : null}

      {activeSection === 'transfers' ? (
        <>
          <section className="panel management-context">
            <div className="management-context__header">
              <h2 className="management-context__title">Traspasos</h2>
              {selectedLeague ? <span className="meta-pill">Liga: {selectedLeague.name}</span> : null}
              {selectedSeason ? <span className="meta-pill">Temporada: {selectedSeason.name}</span> : null}
            </div>

            <div className="management-context__fields">
              <label className="management-field">
                <span>Liga activa</span>
                <select
                  value={selectedLeagueId}
                  onChange={(event) => updateSelection(event.target.value, '')}
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
                  disabled={!selectedLeagueId || selectedLeagueSeasons.length === 0}
                >
                  {selectedLeagueSeasons.length === 0 ? (
                    <option value="">Sin temporadas</option>
                  ) : (
                    selectedLeagueSeasons.map((season) => (
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
              Selecciona una liga y una temporada para gestionar traspasos.
            </div>
          ) : (
            <section className="management-grid">
              <article className="panel management-card">
                <h2 className="management-card__title">Nuevo traspaso</h2>
                <form className="management-form" onSubmit={handleCreateTransfer}>
                  <label className="management-field">
                    <span>Equipo origen</span>
                    <select
                      value={sourceTeamId}
                      onChange={(event) => setSourceTeamId(event.target.value)}
                      disabled={isLoadingTeams || sortedTeams.length === 0}
                    >
                      {sortedTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {getTeamDisplayName(team)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="management-field">
                    <span>Jugador</span>
                    <select
                      value={transferPlayerId}
                      onChange={(event) => setTransferPlayerId(event.target.value)}
                      disabled={isLoadingSourceTeam || sourceTeamPlayers.length === 0}
                    >
                      {sourceTeamPlayers.length === 0 ? (
                        <option value="">Sin jugadores disponibles</option>
                      ) : (
                        sourceTeamPlayers.map((player) => (
                          <option key={player.player_id} value={player.player_id}>
                            {player.name} · Media {player.average ?? '-'}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className="management-field">
                    <span>Equipo destino</span>
                    <select
                      value={destinationTeamId}
                      onChange={(event) => setDestinationTeamId(event.target.value)}
                      disabled={sortedTeams.length < 2}
                    >
                      {sortedTeams
                        .filter((team) => String(team.id) !== sourceTeamId)
                        .map((team) => (
                          <option key={team.id} value={team.id}>
                            {getTeamDisplayName(team)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="management-field">
                    <span>Tipo de transacción</span>
                    <select
                      value={transferType}
                      onChange={(event) => setTransferType(event.target.value)}
                    >
                      <option value="fichaje">Fichaje</option>
                      <option value="cesion">Cesión</option>
                    </select>
                  </label>

                  <button
                    className="management-primary-button"
                    type="submit"
                    disabled={!transferPlayerId || !destinationTeamId}
                  >
                    Registrar traspaso
                  </button>
                </form>
              </article>

              <article className="panel management-card">
                <h2 className="management-card__title">Historial de transacciones</h2>
                {isLoadingTransactions ? (
                  <div className="panel-empty">Cargando historial...</div>
                ) : transactions.length === 0 ? (
                  <div className="panel-empty">Todavía no hay traspasos registrados.</div>
                ) : (
                  <div className="management-list">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="panel management-list__item">
                        <div>
                          <p className="management-list__title">
                            {transaction.player_name}: {transaction.from_team_name} {'>'} {transaction.to_team_name}
                          </p>
                          <div className="management-list__meta">
                            <span className="meta-pill">
                              {transaction.transaction_type === 'cesion' ? 'Cesión' : 'Fichaje'}
                            </span>
                            <span className="meta-pill">
                              {new Date(transaction.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}
        </>
      ) : null}
    </section>
  );
}

export default ManagementPage;

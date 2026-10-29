import { useEffect, useMemo, useState } from 'react';
import charactersData from '../../data/inazuma_characters.json';
import elementIcons from '../../data/elements_img.json';
import genderIcons from '../../data/gender_img.json';
import './PlayersPage.css';

const PLAYERS_PER_PAGE = 50;

const ELEMENT_LABELS = {
  FUE: 'Fuego',
  BOS: 'Bosque',
  MON: 'Montaña',
  AIR: 'Aire',
};

const POSITION_LABELS = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Medio',
  DEL: 'Delantero',
};

const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Femenino',
};

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis-end', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    totalPages,
  ];
}

function PlayersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [elementFilter, setElementFilter] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [copiedPlayerId, setCopiedPlayerId] = useState(null);

  const allPlayers = useMemo(
    () => charactersData,
    []
  );

  const activePlayers = useMemo(
    () => allPlayers.filter((player) => player.active === true),
    [allPlayers]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allPlayers.filter((player) => {
      if (statusFilter === 'ACTIVE' && player.active !== true) {
        return false;
      }

      if (statusFilter === 'INACTIVE' && player.active !== false) {
        return false;
      }

      if (genderFilter !== 'ALL' && player.gender !== genderFilter) {
        return false;
      }

      if (elementFilter !== 'ALL' && player.element !== elementFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableName = `${player.name ?? ''} ${player.nickname ?? ''}`.toLowerCase();
      return searchableName.includes(normalizedSearch);
    });
  }, [allPlayers, elementFilter, genderFilter, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  );

  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;

    return filteredPlayers.slice(startIndex, startIndex + PLAYERS_PER_PAGE);
  }, [filteredPlayers, currentPage]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [elementFilter, genderFilter, searchTerm, statusFilter]);

  const startPlayer = filteredPlayers.length === 0
    ? 0
    : (currentPage - 1) * PLAYERS_PER_PAGE + 1;
  const endPlayer = Math.min(
    currentPage * PLAYERS_PER_PAGE,
    filteredPlayers.length
  );

  const handleCopyPlayerId = async (event, playerId) => {
    event.preventDefault();

    try {
      await navigator.clipboard.writeText(String(playerId));
      setCopiedPlayerId(playerId);
    } catch (error) {
      setCopiedPlayerId(null);
    }
  };

  useEffect(() => {
    if (copiedPlayerId === null) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedPlayerId(null);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copiedPlayerId]);

  return (
    <section className="page-section">
      <header className="page-header">
        <p className="page-eyebrow">Jugadores</p>
        <h1 className="page-title">Listado de jugadores</h1>
        <p className="page-description">
          Aqui tienes el archivo completo de personajes en formato lista, con
          busqueda por nombre, filtros y paginacion de 50 en 50.
        </p>
      </header>

      <div className="players-toolbar panel">
        <div className="players-toolbar__meta">
          <span className="meta-pill">Total: {allPlayers.length}</span>
          <span className="meta-pill">Activos: {activePlayers.length}</span>
          <span className="meta-pill">Filtrados: {filteredPlayers.length}</span>
          <span className="meta-pill">
            Mostrando: {startPlayer}-{endPlayer}
          </span>
          <span className="meta-pill">
            Pagina: {currentPage}/{totalPages}
          </span>
          {copiedPlayerId !== null ? (
            <span className="meta-pill">ID copiado: {copiedPlayerId}</span>
          ) : null}
        </div>

        <label className="players-search" htmlFor="players-search-input">
          <span className="players-search__label">Buscar por nombre</span>
          <input
            id="players-search-input"
            className="players-search__input"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Ej. Mark Evans"
          />
        </label>

        <div className="players-filters">
          <label className="players-filter" htmlFor="players-filter-status">
            <span className="players-search__label">Estado</span>
            <select
              id="players-filter-status"
              className="players-filter__select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </label>

          <label className="players-filter" htmlFor="players-filter-gender">
            <span className="players-search__label">Genero</span>
            <select
              id="players-filter-gender"
              className="players-filter__select"
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </label>

          <label className="players-filter" htmlFor="players-filter-element">
            <span className="players-search__label">Elemento</span>
            <select
              id="players-filter-element"
              className="players-filter__select"
              value={elementFilter}
              onChange={(event) => setElementFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="FUE">Fuego</option>
              <option value="BOS">Bosque</option>
              <option value="MON">Montaña</option>
              <option value="AIR">Aire</option>
            </select>
          </label>
        </div>
      </div>

      {paginatedPlayers.length === 0 ? (
        <div className="panel panel-empty">
          No hay jugadores que coincidan con los filtros actuales.
        </div>
      ) : (
        <div className="players-list panel">
          <div className="players-list__header">
            <span>Imagen</span>
            <span>ID</span>
            <span>Nombre</span>
            <span>Apodo</span>
            <span className="players-list__header-cell--centered">Genero</span>
            <span className="players-list__header-cell--centered">Elemento</span>
            <span>Posicion</span>
          </div>

          {paginatedPlayers.map((player) => (
            <button
              type="button"
              className="players-list__row players-list__row--interactive"
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              onContextMenu={(event) => handleCopyPlayerId(event, player.id)}
              aria-label={`Ver imagen ampliada de ${player.name}`}
              title="Click izquierdo: ver imagen. Click derecho: copiar ID."
            >
              <div className="players-list__image-wrap">
                {player.img ? (
                  <img
                    className="players-list__image"
                    src={player.img}
                    alt={player.name}
                  />
                ) : (
                  <span className="players-list__image-fallback">
                    {player.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="players-list__cell">
                <span className="players-list__label">ID</span>
                <span className="players-list__value">{player.id}</span>
              </div>

              <div className="players-list__cell">
                <span className="players-list__label">Nombre</span>
                <span className="players-list__value players-list__value--strong">
                  {player.name}
                </span>
              </div>

              <div className="players-list__cell">
                <span className="players-list__label">Apodo</span>
                <span className="players-list__value">{player.nickname || '-'}</span>
              </div>

              <div className="players-list__cell players-list__cell--centered">
                <span className="players-list__label">Genero</span>
                <span className="players-list__gender">
                  {genderIcons[player.gender] ? (
                    <img
                      className="players-list__gender-icon"
                      src={genderIcons[player.gender]}
                      alt={GENDER_LABELS[player.gender] || player.gender}
                      title={GENDER_LABELS[player.gender] || player.gender}
                    />
                  ) : null}
                </span>
              </div>

              <div className="players-list__cell players-list__cell--centered">
                <span className="players-list__label">Elemento</span>
                <span className="players-list__element">
                  {elementIcons[player.element] ? (
                    <img
                      className="players-list__element-icon"
                      src={elementIcons[player.element]}
                      alt={ELEMENT_LABELS[player.element] || player.element}
                      title={ELEMENT_LABELS[player.element] || player.element}
                    />
                  ) : null}
                </span>
              </div>

              <div className="players-list__cell">
                <span className="players-list__label">Posicion</span>
                <span className="players-list__value">
                  {POSITION_LABELS[player.position] || player.position || '-'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <nav className="players-pagination" aria-label="Paginacion de jugadores">
        <button
          type="button"
          className="players-pagination__item players-pagination__item--nav"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          aria-label="Pagina anterior"
        >
          &lt;&lt;
        </button>

        {paginationItems.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={
                item === currentPage
                  ? 'players-pagination__item players-pagination__item--active'
                  : 'players-pagination__item'
              }
              onClick={() => setCurrentPage(item)}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              className="players-pagination__item players-pagination__item--ellipsis"
              aria-hidden="true"
            >
              ...
            </span>
          )
        )}

        <button
          type="button"
          className="players-pagination__item players-pagination__item--nav"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          aria-label="Pagina siguiente"
        >
          &gt;&gt;
        </button>
      </nav>

      {selectedPlayer ? (
        <div className="player-image-modal" role="dialog" aria-modal="true">
          <div className="player-image-modal__backdrop" aria-hidden="true" />

          <div className="panel player-image-modal__panel">
            <div className="player-image-modal__header">
              <button
                type="button"
                className="player-image-modal__close"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Cerrar imagen ampliada"
              >
                X
              </button>
            </div>

            <div className="player-image-modal__content">
              <div className="player-image-modal__image-frame">
                {selectedPlayer.img ? (
                  <img
                    className="player-image-modal__image"
                    src={selectedPlayer.img}
                    alt={selectedPlayer.name}
                  />
                ) : (
                  <div className="player-image-modal__fallback">
                    {selectedPlayer.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="player-image-modal__details">
              <div className="player-image-modal__identity">
                <h3 className="player-image-modal__name">{selectedPlayer.name}</h3>
                <p className="player-image-modal__nickname">
                  {selectedPlayer.nickname || 'Sin apodo'}
                </p>
              </div>

              <div className="player-image-modal__stats">
                <div className="player-image-modal__stat player-image-modal__stat--element">
                  <span className="player-image-modal__stat-label">Afinidad</span>
                  <span className="player-image-modal__stat-value player-image-modal__stat-value--icon">
                    {elementIcons[selectedPlayer.element] ? (
                      <img
                        className="player-image-modal__stat-icon"
                        src={elementIcons[selectedPlayer.element]}
                        alt={ELEMENT_LABELS[selectedPlayer.element] || selectedPlayer.element}
                      />
                    ) : null}
                    <strong>
                      {ELEMENT_LABELS[selectedPlayer.element] || selectedPlayer.element || '-'}
                    </strong>
                  </span>
                </div>

                <div className="player-image-modal__stat">
                  <span className="player-image-modal__stat-label">Genero</span>
                  <span className="player-image-modal__stat-value player-image-modal__stat-value--icon">
                    {genderIcons[selectedPlayer.gender] ? (
                      <img
                        className="player-image-modal__stat-icon player-image-modal__stat-icon--gender"
                        src={genderIcons[selectedPlayer.gender]}
                        alt={GENDER_LABELS[selectedPlayer.gender] || selectedPlayer.gender}
                      />
                    ) : null}
                    <strong>
                      {GENDER_LABELS[selectedPlayer.gender] || selectedPlayer.gender || '-'}
                    </strong>
                  </span>
                </div>

                <div className="player-image-modal__stat">
                  <span className="player-image-modal__stat-label">Posicion</span>
                  <span className="player-image-modal__stat-value">
                    <strong>
                      {POSITION_LABELS[selectedPlayer.position] || selectedPlayer.position || '-'}
                    </strong>
                  </span>
                </div>

                <div className="player-image-modal__stat">
                  <span className="player-image-modal__stat-label">ID</span>
                  <span className="player-image-modal__stat-value">
                    <strong>{selectedPlayer.id}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlayersPage;

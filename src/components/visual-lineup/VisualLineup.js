import './VisualLineup.css';
import elementsImages from '../../data/elements_img.json';

const VISUAL_ROWS = ['DEL', 'MED', 'DEF', 'POR'];
const POSITION_TITLES = {
  DEL: 'Delantera',
  MED: 'Medios',
  DEF: 'Defensa',
  POR: 'Porteria',
};

function getDisplayName(player) {
  if (!player) {
    return '';
  }

  return player.nickname || player.player;
}

function getAffinityScoreLabel(score) {
  if (score > 0) {
    return `+${score}`;
  }

  return `${score}`;
}

function getRoleLabel(captainValue) {
  if (captainValue === 1) {
    return 'C';
  }

  if (captainValue === 2) {
    return 'SC';
  }

  return '';
}

function getElementImage(element) {
  if (!element) {
    return elementsImages.NEUTRO || elementsImages.neutro || '';
  }

  return (
    elementsImages[element] ||
    elementsImages[String(element).toUpperCase()] ||
    elementsImages[String(element).toLowerCase()] ||
    ''
  );
}

function groupPlayersByPosition(players) {
  return VISUAL_ROWS.reduce((groups, position) => {
    groups[position] = players.filter((player) => player.idealPosition === position);
    return groups;
  }, {});
}

function VisualLineup({
  players,
  formationLabel,
  teamName,
  teamLogo,
  selectedAffinity,
  onPlayerClick,
}) {
  if (!players || players.length === 0) {
    return null;
  }

  const playersByPosition = groupPlayersByPosition(players);

  return (
    <article className="panel visual-lineup">
      <div className="visual-lineup__header">
        <div>
          <h2 className="team-roster__title">Once visual</h2>
          <p className="visual-lineup__description">
            Vista rapida del once generado sobre el campo.
          </p>
        </div>

        <span className="meta-pill">Alineacion: {formationLabel}</span>
      </div>

      <div className="pitch">
        <div className="pitch__half-line" aria-hidden="true" />
        <div className="pitch__center-circle" aria-hidden="true" />
        <div className="pitch__center-dot" aria-hidden="true" />
        <div className="pitch__top-box" aria-hidden="true" />
        <div className="pitch__top-goal-area" aria-hidden="true" />
        <div className="pitch__bottom-box" aria-hidden="true" />
        <div className="pitch__bottom-goal-area" aria-hidden="true" />

        <div className="pitch__team-brand">
          <div className="pitch__team-brand-logo" aria-hidden="true">
            {teamLogo ? (
              <img className="pitch__team-brand-image" src={teamLogo} alt="" />
            ) : (
              <span>{teamName?.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="pitch__team-brand-text">
            <span className="pitch__team-brand-label">Equipo</span>
            <strong className="pitch__team-brand-name">{teamName}</strong>
            <span className="pitch__team-brand-detail">
              Afinidad del campo:
              {getElementImage(selectedAffinity) ? (
                <img
                  className="pitch__team-brand-detail-icon"
                  src={getElementImage(selectedAffinity)}
                  alt=""
                />
              ) : null}
            </span>
          </div>
        </div>

        <div className="pitch__legend">
          <span className="pitch__legend-item">
            <span className="pitch__legend-badge pitch__legend-badge--captain">C</span>
            <span>Capitan</span>
          </span>
          <span className="pitch__legend-item">
            <span className="pitch__legend-badge pitch__legend-badge--vice">SC</span>
            <span>Subcapitan</span>
          </span>
        </div>

        <div className="pitch__rows">
          {VISUAL_ROWS.map((position) => (
            <div className="pitch__row" key={position}>
              <span className="sr-only">{POSITION_TITLES[position]}</span>

              {playersByPosition[position].map((player, index) => (
                <button
                  type="button"
                  className={
                    onPlayerClick
                      ? 'pitch-player pitch-player--interactive'
                      : 'pitch-player'
                  }
                  key={`${player.player}-${position}-${index}`}
                  onClick={
                    onPlayerClick ? () => onPlayerClick(player) : undefined
                  }
                  aria-label={`Cambiar a ${player.player}`}
                >
                  {player.captain > 0 ? (
                    <span
                      className={`pitch-player__badge pitch-player__badge--${player.captain}`}
                    >
                      {getRoleLabel(player.captain)}
                    </span>
                  ) : null}

                  <span className="pitch-player__element-badge">
                    {getElementImage(player.element) ? (
                      <img
                        className="pitch-player__element-badge-icon"
                        src={getElementImage(player.element)}
                        alt=""
                      />
                    ) : null}
                  </span>

                  <div className="pitch-player__shirt" aria-hidden="true">
                    {player.img ? (
                      <img
                        className="pitch-player__image"
                        src={player.img}
                        alt=""
                      />
                    ) : (
                      <>
                        <div className="pitch-player__shirt-collar" />
                        <div className="pitch-player__shirt-body" />
                      </>
                    )}
                  </div>
                  <div className="pitch-player__stats">
                    <span className="pitch-player__media">
                      {player.adjustedMedia}
                    </span>
                    <span
                      className={`pitch-player__bonus ${
                        player.affinityScore > 0
                          ? 'pitch-player__bonus--up'
                          : player.affinityScore < 0
                            ? 'pitch-player__bonus--down'
                            : 'pitch-player__bonus--neutral'
                      }`}
                    >
                      {getAffinityScoreLabel(player.affinityScore)}
                    </span>
                  </div>
                  <p className="pitch-player__name">{getDisplayName(player)}</p>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default VisualLineup;
